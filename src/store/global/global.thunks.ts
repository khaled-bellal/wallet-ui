import { push } from "connected-react-router";
import { ethers } from "ethers";
import { Block, TransactionReceipt, TransactionResponse } from "@ethersproject/providers";
import Connector from "@walletconnect/web3-provider";
import hermezjs, {
  CoordinatorAPI,
  Providers,
  Tx,
  TxUtils,
  HermezCompressedAmount,
  Addresses,
} from "@hermeznetwork/hermezjs";
import HermezABI from "@hermeznetwork/hermezjs/src/abis/HermezABI";
import { TxType, TxState } from "@hermeznetwork/hermezjs/src/enums";

import { AppState, AppDispatch, AppThunk } from "src/store";
import * as globalActions from "src/store/global/global.actions";
import * as priceUpdaterApi from "src/apis/price-updater";
import * as hermezWebApi from "src/apis/hermez-web";
import * as storage from "src/utils/storage";
import { isTxMined, hasTxBeenReverted, isTxCanceled, isTxExpectedToFail } from "src/utils/ethereum";
import { CurrencySymbol } from "src/utils/currencies";
import { getNextForgerUrls } from "src/utils/coordinator";

// domain
import {
  CoordinatorState,
  Exit,
  FiatExchangeRates,
  NetworkStatus,
  HistoryTransaction,
  ISOStringDate,
  PendingDelayedWithdraw,
  PendingDeposit,
  PendingWithdraw,
  PoolTransaction,
  TimerWithdraw,
  Token,
} from "src/domain";
// persistence
import { Exits } from "src/persistence";
import * as localStoragePersistence from "src/persistence/local-storage";
import * as persistence from "src/persistence";

/**
 * Sets the environment to use in hermezjs. If the chainId is supported will pick it up
 * a known environment and if not will use the one provided in the .env file
 */
function setHermezEnvironment(chainId: number, chainName: string): AppThunk {
  return (dispatch: AppDispatch) => {
    dispatch(globalActions.loadEthereumNetwork());

    hermezjs.TxPool.initializeTransactionPool();

    if (
      process.env.REACT_APP_ENV === "production" &&
      hermezjs.Environment.isEnvironmentSupported(chainId)
    ) {
      hermezjs.Environment.setEnvironment(chainId);
    }

    if (process.env.REACT_APP_ENV === "development") {
      hermezjs.Environment.setEnvironment({
        baseApiUrl: process.env.REACT_APP_HERMEZ_API_URL,
        contractAddresses: {
          [hermezjs.Constants.ContractNames.Hermez]: process.env.REACT_APP_HERMEZ_CONTRACT_ADDRESS,
          [hermezjs.Constants.ContractNames.WithdrawalDelayer]:
            process.env.REACT_APP_WITHDRAWAL_DELAYER_CONTRACT_ADDRESS,
        },
        batchExplorerUrl: process.env.REACT_APP_BATCH_EXPLORER_URL,
        etherscanUrl: process.env.REACT_APP_ETHERSCAN_URL,
      });
    }

    dispatch(globalActions.loadEthereumNetworkSuccess({ chainId, name: chainName }));
  };
}

/**
 * Changes the route to which the user is going to be redirected to after a successful
 * login
 */
function changeRedirectRoute(redirectRoute: string): AppThunk {
  return (dispatch: AppDispatch) => {
    dispatch(globalActions.changeRedirectRoute(redirectRoute));
  };
}

/**
 * Fetches the USD exchange rates for the requested currency symbols
 */
function fetchFiatExchangeRates(): AppThunk {
  return (dispatch: AppDispatch) => {
    const symbols = Object.values(CurrencySymbol)
      .filter((currency) => currency.code !== CurrencySymbol.USD.code)
      .map((currency) => currency.code);

    dispatch(globalActions.loadFiatExchangeRates());

    return priceUpdaterApi
      .getFiatExchangeRates(symbols)
      .then((fiatExchangeRates: FiatExchangeRates) =>
        dispatch(globalActions.loadFiatExchangeRatesSuccess(fiatExchangeRates))
      )
      .catch((error) => {
        const errorMsg = persistence.getErrorMessage(
          error,
          "Oops ... There was an error fetching fiat exchange rates"
        );
        dispatch(globalActions.loadFiatExchangeRatesFailure(errorMsg));
      });
  };
}

/**
 * Changes the current network status of the application
 */
function changeNetworkStatus(newNetworkStatus: NetworkStatus, backgroundColor: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { networkStatus: previousNetworkStatus },
    } = getState();

    if (previousNetworkStatus === "online" && newNetworkStatus === "offline") {
      dispatch(globalActions.openSnackbar("Connection lost", backgroundColor));
    }

    if (previousNetworkStatus === "offline" && newNetworkStatus === "online") {
      dispatch(globalActions.openSnackbar("Connection restored", backgroundColor));
    }

    dispatch(globalActions.changeNetworkStatus(newNetworkStatus));
  };
}

function checkHermezStatus(): AppThunk {
  return (dispatch: AppDispatch) => {
    dispatch(globalActions.loadHermezStatus());

    return hermezWebApi
      .getNetworkStatus()
      .then((status: number) => dispatch(globalActions.loadHermezStatusSuccess(status)))
      .catch(() =>
        dispatch(
          globalActions.loadHermezStatusFailure("An error occurred loading Polygon Hermez status")
        )
      );
  };
}

/**
 * Adds a pendingWithdraw to the pendingWithdraw pool
 */
function addPendingWithdraw(pendingWithdraw: PendingWithdraw): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      const { hermezEthereumAddress } = wallet;
      if (chainId !== undefined) {
        localStoragePersistence.addPendingWithdraw(chainId, hermezEthereumAddress, pendingWithdraw);
        dispatch(globalActions.addPendingWithdraw(chainId, hermezEthereumAddress, pendingWithdraw));
      }
    }
  };
}

/**
 * Removes a pendingWithdraw from the pendingWithdraw pool
 */
function removePendingWithdraw(hash: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.removePendingWithdrawByHash(chainId, hermezEthereumAddress, hash);
        dispatch(globalActions.removePendingWithdraw(chainId, hermezEthereumAddress, hash));
      }
    }
  };
}

/**
 * Adds a pendingWithdraw to the pendingDelayedWithdraw store
 */
function addPendingDelayedWithdraw(pendingDelayedWithdraw: PendingDelayedWithdraw): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.addPendingDelayedWithdraw(
          chainId,
          hermezEthereumAddress,
          pendingDelayedWithdraw
        );
        dispatch(
          globalActions.addPendingDelayedWithdraw(
            chainId,
            hermezEthereumAddress,
            pendingDelayedWithdraw
          )
        );
      }
    }
  };
}

/**
 * Removes a pendingWithdraw from the pendingDelayedWithdraw store
 */
function removePendingDelayedWithdraw(pendingDelayedWithdrawId: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.removePendingDelayedWithdrawById(
          chainId,
          hermezEthereumAddress,
          pendingDelayedWithdrawId
        );
        dispatch(
          globalActions.removePendingDelayedWithdraw(
            chainId,
            hermezEthereumAddress,
            pendingDelayedWithdrawId
          )
        );
      }
    }
  };
}

/**
 * Removes a pendingWithdraw from the pendingDelayedWithdraws store by hash
 */
function removePendingDelayedWithdrawByHash(pendingDelayedWithdrawHash: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.removePendingDelayedWithdrawByHash(
          chainId,
          hermezEthereumAddress,
          pendingDelayedWithdrawHash
        );
        dispatch(
          globalActions.removePendingDelayedWithdrawByHash(
            chainId,
            hermezEthereumAddress,
            pendingDelayedWithdrawHash
          )
        );
      }
    }
  };
}

/**
 * Updates the date in a delayed withdraw transaction
 * to the time when the transaction was mined
 */
function updatePendingDelayedWithdrawDate(
  transactionHash: string,
  pendingDelayedWithdrawDate: ISOStringDate
): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.updatePendingDelayedWithdrawByHash(
          chainId,
          hermezEthereumAddress,
          transactionHash,
          { timestamp: pendingDelayedWithdrawDate }
        );
        dispatch(
          globalActions.updatePendingDelayedWithdrawDate(
            chainId,
            hermezEthereumAddress,
            transactionHash,
            pendingDelayedWithdrawDate
          )
        );
      }
    }
  };
}

/**
 * Checks L1 transactions for pending delayed withdrawals.
 * If they have failed, clear from storage.
 * Updates the date the transaction happened if necessary.
 */
function checkPendingDelayedWithdrawals(): AppThunk {
  return async (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, pendingDelayedWithdraws, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        dispatch(globalActions.checkPendingDelayedWithdrawals());
        const { hermezEthereumAddress } = wallet;
        const provider = Providers.getProvider();
        const accountEthBalance = await provider.getBalance(
          Addresses.getEthereumAddress(hermezEthereumAddress)
        );
        const accountPendingDelayedWithdraws: PendingDelayedWithdraw[] =
          storage.getPendingDelayedWithdrawsByHermezAddress(
            pendingDelayedWithdraws,
            chainId,
            hermezEthereumAddress
          );

        // Gets the actual transaction and checks if it doesn't exist or is expected to fail
        const pendingDelayedWithdrawsTxs: Promise<TransactionResponse>[] =
          accountPendingDelayedWithdraws.map((pendingDelayedWithdraw) => {
            return provider.getTransaction(pendingDelayedWithdraw.hash).then((tx) => {
              if (tx.blockNumber !== undefined) {
                // Checks whether the date of pendingDelayedWithdraw needs to be updated
                provider
                  .getBlock(tx.blockNumber)
                  .then((block: Block) => {
                    // Converts timestamp from s to ms
                    const newTimestamp = block.timestamp * 1000;
                    if (new Date(pendingDelayedWithdraw.timestamp).getTime() !== newTimestamp) {
                      dispatch(
                        updatePendingDelayedWithdrawDate(
                          pendingDelayedWithdraw.hash,
                          new Date(newTimestamp).toISOString()
                        )
                      );
                    }
                  })
                  .catch(() => ({}));
              }
              // Checks here to have access to pendingDelayedWithdraw.timestamp
              if (
                isTxCanceled(tx) ||
                isTxExpectedToFail(tx, pendingDelayedWithdraw.timestamp, accountEthBalance)
              ) {
                dispatch(removePendingDelayedWithdrawByHash(pendingDelayedWithdraw.hash));
              }
              return tx;
            });
          });

        Promise.all(pendingDelayedWithdrawsTxs)
          .then((txs) => {
            const minedTxs = txs.filter(isTxMined);
            const pendingDelayedWithdrawsTxReceipts = minedTxs.map((tx) =>
              provider.getTransactionReceipt(tx.hash)
            );

            // Checks receipts to see if transactions have been reverted
            Promise.all(pendingDelayedWithdrawsTxReceipts)
              .then((txReceipts) => {
                const revertedTxReceipts = txReceipts.filter(hasTxBeenReverted);

                revertedTxReceipts.forEach((tx) => {
                  dispatch(removePendingDelayedWithdrawByHash(tx.transactionHash));
                });

                // Checks with Coordinator API if exit has been withdrawn
                const exitsApiPromises = accountPendingDelayedWithdraws.map(
                  (pendingDelayedWithdraw) => {
                    return CoordinatorAPI.getExit(
                      pendingDelayedWithdraw.batchNum,
                      pendingDelayedWithdraw.accountIndex
                    ).then((exitTx: Exit) => {
                      // Checks here to have access to pendingDelayedWithdraw.id
                      if (exitTx.delayedWithdraw) {
                        dispatch(removePendingDelayedWithdraw(pendingDelayedWithdraw.id));
                      }
                    });
                  }
                );
                Promise.all(exitsApiPromises).finally(() =>
                  dispatch(globalActions.checkPendingDelayedWithdrawalsSuccess())
                );
              })
              .catch(() => ({}));
          })
          .catch(() => ({}));
      }
    }
  };
}

function addTimerWithdraw(timerWithdraw: TimerWithdraw): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.addTimerWithdraw(chainId, hermezEthereumAddress, timerWithdraw);
        dispatch(globalActions.addTimerWithdraw(chainId, hermezEthereumAddress, timerWithdraw));
      }
    }
  };
}

function removeTimerWithdraw(timerWithdrawId: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        localStoragePersistence.removeTimerWithdrawById(
          chainId,
          hermezEthereumAddress,
          timerWithdrawId
        );
        dispatch(
          globalActions.removeTimerWithdraw(chainId, hermezEthereumAddress, timerWithdrawId)
        );
      }
    }
  };
}

/**
 * Checks if we have some exit that is not saved in localStorage
 */
function recoverPendingDelayedWithdrawals(exits: Exits): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, pendingDelayedWithdraws, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        const { hermezEthereumAddress } = wallet;
        const provider = Providers.getProvider();
        const accountPendingDelayedWithdraws: PendingDelayedWithdraw[] =
          storage.getPendingDelayedWithdrawsByHermezAddress(
            pendingDelayedWithdraws,
            chainId,
            hermezEthereumAddress
          );
        const batchNumPendingDelayedWithdraws = accountPendingDelayedWithdraws.map(
          (account) => account.batchNum
        );

        exits.exits.forEach((exit) => {
          if (
            !batchNumPendingDelayedWithdraws.includes(exit.batchNum) &&
            exit.delayedWithdrawRequest
          ) {
            void provider
              .getBlockWithTransactions(exit.delayedWithdrawRequest)
              .then((blockWithTransactions) => {
                const pendingDelayedWithdraw = blockWithTransactions.transactions.find(
                  (tx) => Addresses.getEthereumAddress(hermezEthereumAddress) === tx.from
                );
                if (pendingDelayedWithdraw) {
                  dispatch(
                    addPendingDelayedWithdraw({
                      ...exit,
                      hash: pendingDelayedWithdraw.hash,
                      id: `${exit.accountIndex}${exit.batchNum}`,
                      hermezEthereumAddress: wallet.hermezEthereumAddress,
                      isInstant: false, // TODO I'll remove this key that it's unused with the ExitCard refactor
                      timestamp: new Date(blockWithTransactions.timestamp * 1000).toISOString(),
                    })
                  );
                }
              })
              .catch(() => ({}));
          }
        });
      }
    }
  };
}

/**
 * Checks pending exits to see if they have been completed
 * and delete them from storage
 */
function checkPendingWithdrawals(): AppThunk {
  return async (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask, pendingWithdraws },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const { hermezEthereumAddress } = wallet;
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        dispatch(globalActions.checkPendingWithdrawals());

        const provider = Providers.getProvider();
        const accountEthBalance = await provider.getBalance(
          Addresses.getEthereumAddress(hermezEthereumAddress)
        );

        const accountPendingWithdraws: PendingWithdraw[] =
          storage.getPendingWithdrawsByHermezAddress(
            pendingWithdraws,
            chainId,
            hermezEthereumAddress
          );
        // Gets the actual transaction and checks if it doesn't exist or is expected to fail
        const pendingWithdrawsTxs: Promise<TransactionResponse>[] = accountPendingWithdraws.map(
          (pendingWithdraw) => {
            return provider.getTransaction(pendingWithdraw.hash).then((tx: TransactionResponse) => {
              // Checks here to have access to pendingWithdraw.timestamp
              if (
                isTxCanceled(tx) ||
                isTxExpectedToFail(tx, pendingWithdraw.timestamp, accountEthBalance)
              ) {
                dispatch(removePendingWithdraw(pendingWithdraw.hash));
              }
              return tx;
            });
          }
        );

        Promise.all(pendingWithdrawsTxs)
          .then((txs) => {
            const minedTxs = txs.filter(isTxMined);
            const pendingWithdrawsTxReceipts: Promise<TransactionReceipt>[] = minedTxs.map((tx) =>
              provider.getTransactionReceipt(tx.hash)
            );

            // Checks receipts to see if transactions have been reverted
            Promise.all(pendingWithdrawsTxReceipts)
              .then((txReceipts) => {
                const revertedTxReceipts = txReceipts.filter(hasTxBeenReverted);

                revertedTxReceipts.forEach((tx) => {
                  dispatch(removePendingWithdraw(tx.transactionHash));
                });

                // Checks with Coordinator API if exit has been withdrawn
                const exitsApiPromises = accountPendingWithdraws.map((pendingWithdraw) => {
                  return CoordinatorAPI.getExit(
                    pendingWithdraw.batchNum,
                    pendingWithdraw.accountIndex
                  ).then((exitTx: Exit) => {
                    // Checks here to have access to pendingWithdraw.hash
                    if (exitTx.instantWithdraw || exitTx.delayedWithdraw) {
                      dispatch(removePendingWithdraw(pendingWithdraw.hash));
                      dispatch(removePendingDelayedWithdraw(pendingWithdraw.id));
                    }
                  });
                });

                Promise.all(exitsApiPromises).finally(() =>
                  dispatch(globalActions.checkPendingWithdrawalsSuccess())
                );
              })
              .catch(() => ({}));
          })
          .catch(() => ({}));
      }
    }
  };
}

/**
 * Adds a pendingDeposit to the pendingDeposits store
 */
function addPendingDeposit(pendingDeposit: PendingDeposit): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const { hermezEthereumAddress } = wallet;
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        localStoragePersistence.addPendingDeposit(chainId, hermezEthereumAddress, pendingDeposit);
        dispatch(globalActions.addPendingDeposit(chainId, hermezEthereumAddress, pendingDeposit));
      }
    }
  };
}

/**
 * Removes a pendingDeposit from the pendingDeposit store by id
 */
function removePendingDepositByTransactionId(transactionId: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const { hermezEthereumAddress } = wallet;
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        localStoragePersistence.removePendingDepositByTransactionId(
          chainId,
          hermezEthereumAddress,
          transactionId
        );
        dispatch(
          globalActions.removePendingDepositByTransactionId(
            chainId,
            hermezEthereumAddress,
            transactionId
          )
        );
      }
    }
  };
}

/**
 * Removes a pendingDeposit from the pendingDeposit store by hash
 */
function removePendingDepositByHash(hash: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const { hermezEthereumAddress } = wallet;
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        localStoragePersistence.removePendingDepositByHash(chainId, hermezEthereumAddress, hash);
        dispatch(globalActions.removePendingDepositByHash(chainId, hermezEthereumAddress, hash));
      }
    }
  };
}

function updatePendingDepositId(transactionHash: string, transactionId: string): AppThunk {
  return (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const { hermezEthereumAddress } = wallet;
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        localStoragePersistence.updatePendingDepositByHash(
          chainId,
          hermezEthereumAddress,
          transactionHash,
          { transactionId }
        );
        dispatch(
          globalActions.updatePendingDepositId(
            chainId,
            hermezEthereumAddress,
            transactionHash,
            transactionId
          )
        );
      }
    }
  };
}

function checkPendingDeposits(): AppThunk {
  return async (dispatch: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, pendingDeposits, ethereumNetworkTask },
    } = getState();
    if (wallet !== undefined && ethereumNetworkTask.status === "successful") {
      const { hermezEthereumAddress } = wallet;
      const {
        data: { chainId },
      } = ethereumNetworkTask;
      if (chainId !== undefined) {
        dispatch(globalActions.checkPendingDeposits());

        const provider = Providers.getProvider();
        const accountEthBalance = await provider.getBalance(
          Addresses.getEthereumAddress(hermezEthereumAddress)
        );
        const accountPendingDeposits: PendingDeposit[] = storage.getPendingDepositsByHermezAddress(
          pendingDeposits,
          chainId,
          hermezEthereumAddress
        );
        const pendingDepositsTxs: Promise<TransactionResponse>[] = accountPendingDeposits.map(
          (pendingDeposit) => {
            return provider.getTransaction(pendingDeposit.hash).then((tx: TransactionResponse) => {
              if (
                isTxCanceled(tx) ||
                isTxExpectedToFail(tx, pendingDeposit.timestamp, accountEthBalance)
              ) {
                dispatch(removePendingDepositByHash(pendingDeposit.hash));
              }

              return tx;
            });
          }
        );

        Promise.all(pendingDepositsTxs)
          .then((txs) => {
            const minedTxs = txs.filter((tx) => tx !== null && tx.blockNumber !== null);
            const pendingDepositsTxReceipts = minedTxs.map((tx) =>
              provider.getTransactionReceipt(tx.hash)
            );

            Promise.all(pendingDepositsTxReceipts)
              .then((txReceipts) => {
                const hermezContractInterface = new ethers.utils.Interface(HermezABI);
                const revertedTxReceipts = txReceipts.filter(hasTxBeenReverted);
                const successfulTxReceipts = txReceipts.filter(
                  (txReceipt) =>
                    txReceipt.status === 1 && txReceipt.logs && txReceipt.logs.length > 0
                );
                const transactionHistoryPromises = successfulTxReceipts.reduce(
                  (accL2Transactions: Promise<HistoryTransaction>[], txReceipt) => {
                    // Need to parse logs, but only events from the Hermez SC. Ignore errors when trying to parse others
                    const parsedLogs = [];
                    for (const txReceiptLog of txReceipt.logs) {
                      try {
                        const parsedLog = hermezContractInterface.parseLog(txReceiptLog);
                        parsedLogs.push(parsedLog);
                        // eslint-disable-next-line no-empty
                      } catch (e) {}
                    }
                    const l1UserTxEvent = parsedLogs.find(
                      (event) => event.name === "L1UserTxEvent"
                    );

                    if (!l1UserTxEvent) {
                      return accL2Transactions;
                    }

                    const txId = TxUtils.getL1UserTxId(
                      l1UserTxEvent.args[0],
                      l1UserTxEvent.args[1]
                    );
                    const pendingDeposit = accountPendingDeposits.find(
                      (deposit) => deposit.hash === txReceipt.transactionHash
                    );

                    if (pendingDeposit && !pendingDeposit.transactionId) {
                      dispatch(updatePendingDepositId(txReceipt.transactionHash, txId));
                    }

                    return [...accL2Transactions, CoordinatorAPI.getHistoryTransaction(txId)];
                  },
                  []
                );

                revertedTxReceipts.forEach((tx) => {
                  dispatch(removePendingDepositByHash(tx.transactionHash));
                });

                Promise.all(transactionHistoryPromises)
                  .then((results) => {
                    results.forEach((transaction) => {
                      if (transaction.batchNum !== null) {
                        dispatch(removePendingDepositByTransactionId(transaction.id));
                      }
                    });
                    dispatch(globalActions.checkPendingDepositsSuccess());
                  })
                  .catch(() => dispatch(globalActions.checkPendingDepositsSuccess()));
              })
              .catch(() => ({}));
          })
          .catch(() => ({}));
      }
    }
  };
}

function checkPendingTransactions(): AppThunk {
  return (_: AppDispatch, getState: () => AppState) => {
    const {
      global: { wallet, coordinatorStateTask },
    } = getState();

    if (wallet !== undefined && coordinatorStateTask.status === "successful") {
      const nextForgerUrls = getNextForgerUrls(coordinatorStateTask.data);

      hermezjs.TxPool.getPoolTransactions(undefined, wallet.publicKeyCompressedHex)
        .then((poolTransactions: PoolTransaction[]) => {
          const tenMinutesInMs = 10 * 60 * 1000;
          const oneDayInMs = 24 * 60 * 60 * 1000;
          const resendTransactionsRequests = poolTransactions
            .filter((transaction) => {
              const txTimestampInMs = new Date(transaction.timestamp).getTime();
              const nowInMs = new Date().getTime();

              // Retry the transaction if it hasn't been forged after 10min and it's not 24h old yet+
              return (
                transaction.state !== TxState.Forged &&
                txTimestampInMs + tenMinutesInMs < nowInMs &&
                txTimestampInMs + oneDayInMs > nowInMs
              );
            })
            .map((transaction: PoolTransaction) => {
              const txData = {
                type: transaction.type,
                from: transaction.fromAccountIndex,
                amount: HermezCompressedAmount.compressAmount(transaction.amount),
                ...(transaction.type === TxType.TransferToEthAddr
                  ? { to: transaction.toHezEthereumAddress }
                  : transaction.type === TxType.Transfer
                  ? { to: transaction.toAccountIndex }
                  : { to: null }),
                fee: transaction.fee,
              };

              return Tx.generateAndSendL2Tx(
                txData,
                wallet,
                transaction.token,
                nextForgerUrls,
                false
              ).catch(() => ({}));
            });

          Promise.all(resendTransactionsRequests).catch(() => ({}));
        })
        .catch(() => ({}));
    }
  };
}

/**
 * Fetches the state of the coordinator
 */
function fetchCoordinatorState(): AppThunk {
  return (dispatch: AppDispatch) => {
    dispatch(globalActions.loadCoordinatorState());

    return hermezjs.CoordinatorAPI.getState()
      .then((coordinatorState: CoordinatorState) =>
        dispatch(globalActions.loadCoordinatorStateSuccess(coordinatorState))
      )
      .catch((err: Error) => dispatch(globalActions.loadCoordinatorStateFailure(err)));
  };
}

/**
 * Removes the MetaMask wallet data from the Redux store and the localStorage
 */
function disconnectWallet(): AppThunk {
  return (dispatch: AppDispatch) => {
    const provider = Providers.getProvider();

    if (provider.provider instanceof Connector) {
      // Kills the stored Web Connect session to show QR with next login
      provider.provider.connector.killSession().catch(() => ({}));
    }

    dispatch(globalActions.unloadWallet());
    dispatch(push("/login"));
  };
}

/**
 * Reloads the webapp
 */
function reloadApp(): AppThunk {
  return () => {
    window.location.reload();
  };
}

/**
 * Fetch tokens price
 */
function fetchTokensPrice(): AppThunk {
  return (dispatch: AppDispatch) => {
    dispatch(globalActions.loadTokensPrice());

    return priceUpdaterApi
      .getTokensPrice()
      .then((res: Token[]) => dispatch(globalActions.loadTokensPriceSuccess(res)))
      .catch(() => globalActions.loadTokensPriceFailure("An error occured loading token."));
  };
}

export {
  setHermezEnvironment,
  changeRedirectRoute,
  fetchFiatExchangeRates,
  changeNetworkStatus,
  checkHermezStatus,
  addPendingWithdraw,
  removePendingWithdraw,
  addPendingDelayedWithdraw,
  removePendingDelayedWithdraw,
  updatePendingDelayedWithdrawDate,
  checkPendingDelayedWithdrawals,
  checkPendingWithdrawals,
  addTimerWithdraw,
  removeTimerWithdraw,
  addPendingDeposit,
  removePendingDepositByTransactionId,
  removePendingDepositByHash,
  updatePendingDepositId,
  checkPendingDeposits,
  checkPendingTransactions,
  fetchCoordinatorState,
  disconnectWallet,
  reloadApp,
  fetchTokensPrice,
  recoverPendingDelayedWithdrawals,
};
