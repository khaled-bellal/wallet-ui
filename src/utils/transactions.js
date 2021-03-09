import { TxType } from '@hermeznetwork/hermezjs/src/enums'

function getTransactionAmount (transaction) {
  if (!transaction) {
    return undefined
  }

  if (!transaction.L1Info) {
    return transaction.amount
  } else {
    if (transaction.type === TxType.Deposit || transaction.type === TxType.CreateAccountDeposit) {
      return transaction.L1Info.depositAmount
    } else {
      return transaction.amount
    }
  }
}

/**
 * Calculates an estimated time until the transaction will be forged
 * @param {Object} coordinatorState - As returned from the API
 * @param {Object} transactionTimestamp - The timestamp for a specific transaction
 * @returns {Number} timeLeftToForgeInMinutes
 */
function getTxPendingTime (coordinatorState, transactionTimestamp) {
  const timeToForge = coordinatorState.nodeConfig.forgeDelay
  const lastBatchForgedInSeconds = Date.parse(coordinatorState.network.lastBatch.timestamp) / 1000
  const timeSinceTxInSeconds = lastBatchForgedInSeconds - (Date.parse(transactionTimestamp) / 1000)
  const timeLeftToForgeInMinutes = Math.round((timeToForge - timeSinceTxInSeconds) / 60)
  return timeLeftToForgeInMinutes > 0 ? timeLeftToForgeInMinutes : 0
}

export {
  getTransactionAmount,
  getTxPendingTime
}
