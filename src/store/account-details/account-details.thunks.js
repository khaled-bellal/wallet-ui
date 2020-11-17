import { CoordinatorAPI } from 'hermezjs'
import { getPoolTransactions } from 'hermezjs/src/tx-pool'

import * as accountDetailsActionTypes from './account-details.actions'
import { removePendingWithdraw } from '../global/global.thunks'

/**
 * Fetches the account details for the specified account index
 * @param {string} accountIndex - The account index
 * @returns {void}
 */
function fetchAccount (accountIndex) {
  return (dispatch) => {
    dispatch(accountDetailsActionTypes.loadAccount())

    return CoordinatorAPI.getAccount(accountIndex)
      .then(res => dispatch(accountDetailsActionTypes.loadAccountSuccess(res)))
      .catch(err => dispatch(accountDetailsActionTypes.loadAccountFailure(err)))
  }
}

/**
 * Fetches the transaction details for each transaction in the pool for the specified account index
 * @param {string} accountIndex - The account index
 * @returns {void}
 */
function fetchPoolTransactions (accountIndex) {
  return (dispatch, getState) => {
    dispatch(accountDetailsActionTypes.loadPoolTransactions())

    const { global: { metaMaskWalletTask } } = getState()

    if (metaMaskWalletTask.status === 'successful') {
      const { publicKeyCompressedHex } = metaMaskWalletTask.data
      getPoolTransactions(accountIndex, publicKeyCompressedHex)
        .then((transactions) => dispatch(accountDetailsActionTypes.loadPoolTransactionsSuccess(transactions)))
        .catch(err => dispatch(accountDetailsActionTypes.loadPoolTransactionsFailure(err)))
    } else {
      dispatch(accountDetailsActionTypes.loadPoolTransactionsFailure('MetaMask wallet is not available'))
    }
  }
}

/**
 * Fetches the transactions details for the specified account index
 * @param {string} accountIndex - The account index
 * @returns {void}
 */
function fetchHistoryTransactions (accountIndex) {
  return (dispatch, getState) => {
    dispatch(accountDetailsActionTypes.loadHistoryTransactions())

    const { accountDetails: { exitsTask }, global: { metaMaskWalletTask } } = getState()

    return CoordinatorAPI.getTransactions(undefined, undefined, undefined, accountIndex)
      .then((res) => {
        res.transactions = res.transactions.filter((transaction) => {
          if (transaction.type === 'Exit') {
            const exitTx = exitsTask.data.exits.find((exit) =>
              exit.batchNum === transaction.batchNum &&
              exit.accountIndex === transaction.fromAccountIndex
            )
            if (exitTx) {
              if (exitTx.instantWithdrawn) {
                removePendingWithdraw(metaMaskWalletTask.data.hermezEthereumAddress, exitTx.accountIndex + exitTx.merkleProof.Root)
                return true
              } else {
                return false
              }
            } else {
              return true
            }
          } else {
            return true
          }
        })

        return res
      })
      .then(res => dispatch(accountDetailsActionTypes.loadHistoryTransactionsSuccess(res)))
      .catch(err => dispatch(accountDetailsActionTypes.loadHistoryTransactionsFailure(err)))
  }
}

/**
 * Fetches the exit data for transactions of type Exit that are still pending a withdraw
 */
function fetchExits () {
  return (dispatch) => {
    dispatch(accountDetailsActionTypes.loadExits())

    return CoordinatorAPI.getExits(true)
      .then(exits => dispatch(accountDetailsActionTypes.loadExitsSuccess(exits)))
      .catch(err => dispatch(accountDetailsActionTypes.loadExitsFailure(err)))
  }
}

export {
  fetchAccount,
  fetchPoolTransactions,
  fetchHistoryTransactions,
  fetchExits
}
