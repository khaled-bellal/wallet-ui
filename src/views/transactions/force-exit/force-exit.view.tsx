import React from "react";
import { connect } from "react-redux";
import { push } from "connected-react-router";
import { BigNumber } from "@ethersproject/bignumber";
import { TxType } from "@hermeznetwork/hermezjs/src/enums";

import { AppState, AppDispatch } from "src/store";
import * as forceExitThunks from "src/store/transactions/force-exit/force-exit.thunks";
import * as forceExitActions from "src/store/transactions/force-exit/force-exit.actions";
import { changeHeader } from "src/store/global/global.actions";
import { AccountsWithPagination } from "src/store/transactions/force-exit/force-exit.reducer";
import { HeaderState } from "src/store/global/global.reducer";
import useForceExitStyles from "src/views/transactions/force-exit/force-exit.styles";
import TransactionOverview from "src/views/transactions/components/transaction-overview/transaction-overview.view";
import AccountSelector from "src/views/transactions/components/account-selector/account-selector.view";
import ForceExitForm from "src/views/transactions/force-exit/components/force-exit-form/force-exit-form.view";
import { AsyncTask } from "src/utils/types";
// domain
import { HermezAccount, HermezWallet, FiatExchangeRates, PoolTransaction } from "src/domain";

interface ForceExitStateProps {
  step: forceExitActions.Step;
  accountsTask: AsyncTask<AccountsWithPagination, Error>;
  poolTransactionsTask: AsyncTask<PoolTransaction[], Error>;
  isTransactionBeingApproved: boolean;
  account?: HermezAccount;
  transaction?: forceExitActions.TransactionToReview;
  wallet: HermezWallet.HermezWallet | undefined;
  preferredCurrency: string;
  fiatExchangeRatesTask: AsyncTask<FiatExchangeRates, string>;
}

interface ForxeExitHandlerProps {
  onChangeHeader: (step: forceExitActions.Step, account?: HermezAccount) => void;
  onGoToChooseAccountStep: () => void;
  onGoToBuildTransactionStep: (account: HermezAccount) => void;
  onGoToTransactionOverviewStep: (
    transactionToReview: forceExitActions.TransactionToReview
  ) => void;
  onLoadAccounts: (
    fromItem: number | undefined,
    poolTransactions: PoolTransaction[],
    fiatExchangeRates: FiatExchangeRates,
    preferredCurrency: string
  ) => void;
  onLoadPoolTransactions: () => void;
  onForceExit: (amount: BigNumber, account: HermezAccount) => void;
  onCleanup: () => void;
}

type ForceExitProps = ForceExitStateProps & ForxeExitHandlerProps;

function ForceExit({
  step,
  accountsTask,
  poolTransactionsTask,
  isTransactionBeingApproved,
  account,
  transaction,
  wallet,
  preferredCurrency,
  fiatExchangeRatesTask,
  onChangeHeader,
  onLoadAccounts,
  onLoadPoolTransactions,
  onGoToChooseAccountStep,
  onGoToBuildTransactionStep,
  onGoToTransactionOverviewStep,
  onForceExit,
  onCleanup,
}: ForceExitProps) {
  const classes = useForceExitStyles();

  React.useEffect(() => {
    onChangeHeader(step, account);
  }, [step, account, onChangeHeader]);

  React.useEffect(() => {
    onLoadPoolTransactions();
  }, [onLoadPoolTransactions]);

  React.useEffect(() => onCleanup, [onCleanup]);

  return (
    <div className={classes.root}>
      {(() => {
        switch (step) {
          case "choose-account": {
            return (
              <AccountSelector
                type={TxType.ForceExit}
                accountsTask={accountsTask}
                poolTransactionsTask={poolTransactionsTask}
                onLoadAccounts={onLoadAccounts}
                onAccountClick={onGoToBuildTransactionStep}
                preferredCurrency={preferredCurrency}
                fiatExchangeRates={
                  fiatExchangeRatesTask.status === "successful" ||
                  fiatExchangeRatesTask.status === "reloading"
                    ? fiatExchangeRatesTask.data
                    : {}
                }
              />
            );
          }
          case "build-transaction": {
            return (
              account && (
                <ForceExitForm
                  account={account}
                  preferredCurrency={preferredCurrency}
                  fiatExchangeRatesTask={fiatExchangeRatesTask}
                  onSubmit={onGoToTransactionOverviewStep}
                  onGoToChooseAccountStep={onGoToChooseAccountStep}
                />
              )
            );
          }
          case "review-transaction": {
            return (
              wallet &&
              account &&
              transaction && (
                <TransactionOverview
                  wallet={wallet}
                  isTransactionBeingApproved={isTransactionBeingApproved}
                  txType={TxType.ForceExit}
                  amount={transaction.amount}
                  account={account}
                  onForceExit={onForceExit}
                  preferredCurrency={preferredCurrency}
                  fiatExchangeRates={
                    fiatExchangeRatesTask.status === "successful" ||
                    fiatExchangeRatesTask.status === "reloading"
                      ? fiatExchangeRatesTask.data
                      : {}
                  }
                />
              )
            );
          }
        }
      })()}
    </div>
  );
}

const mapStateToProps = (state: AppState): ForceExitStateProps => ({
  step: state.forceExit.step,
  accountsTask: state.forceExit.accountsTask,
  poolTransactionsTask: state.forceExit.poolTransactionsTask,
  wallet: state.global.wallet,
  isTransactionBeingApproved: state.forceExit.isTransactionBeingApproved,
  account: state.forceExit.account,
  transaction: state.forceExit.transaction,
  fiatExchangeRatesTask: state.global.fiatExchangeRatesTask,
  preferredCurrency: state.myAccount.preferredCurrency,
});

const getHeader = (step: forceExitActions.Step, account?: HermezAccount): HeaderState => {
  switch (step) {
    case "choose-account": {
      return {
        type: "page",
        data: {
          title: "Token",
          closeAction: push(`/`),
        },
      };
    }
    case "build-transaction": {
      return {
        type: "page",
        data: {
          title: "Force withdraw",
          goBackAction: forceExitActions.goToChooseAccountStep(),
          closeAction: push(`/`),
        },
      };
    }
    case "review-transaction": {
      return {
        type: "page",
        data: {
          title: "Force withdraw",
          goBackAction: account ? forceExitActions.goToBuildTransactionStep(account) : undefined,
          closeAction: push(""),
        },
      };
    }
  }
};

const mapDispatchToProps = (dispatch: AppDispatch): ForxeExitHandlerProps => ({
  onChangeHeader: (step, account) => dispatch(changeHeader(getHeader(step, account))),
  onGoToChooseAccountStep: () => dispatch(forceExitActions.goToChooseAccountStep()),
  onGoToBuildTransactionStep: (account: HermezAccount) =>
    dispatch(forceExitActions.goToBuildTransactionStep(account)),
  onGoToTransactionOverviewStep: (transactionToReview: forceExitActions.TransactionToReview) =>
    dispatch(forceExitActions.goToReviewTransactionStep(transactionToReview)),
  onLoadAccounts: (
    fromItem: number | undefined,
    poolTransactions: PoolTransaction[],
    fiatExchangeRates: FiatExchangeRates,
    preferredCurrency: string
  ) =>
    dispatch(
      forceExitThunks.fetchAccounts(
        fromItem,
        poolTransactions,
        fiatExchangeRates,
        preferredCurrency
      )
    ),
  onLoadPoolTransactions: () => dispatch(forceExitThunks.fetchPoolTransactions()),
  onForceExit: (amount: BigNumber, account: HermezAccount) =>
    dispatch(forceExitThunks.forceExit(amount, account)),
  onCleanup: () => dispatch(forceExitActions.resetState()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ForceExit);
