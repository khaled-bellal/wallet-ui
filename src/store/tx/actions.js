import * as CONSTANTS from './constants'
import { hexToPoint, exitAy, exitAx } from '../../utils/utils'

const ethers = require('ethers')
const rollup = require('../../utils/bundle-cli')
const operator = require('../../utils/bundle-op')
const abiDecoder = require('abi-decoder')
const Web3 = require('web3')

const gasLimit = 5000000

function sendDeposit () {
  return {
    type: CONSTANTS.SEND_DEPOSIT
  }
}

function sendDepositSuccess (res, currentBatch) {
  return {
    type: CONSTANTS.SEND_DEPOSIT_SUCCESS,
    payload: { res, currentBatch },
    error: ''
  }
}

function sendDepositError (error) {
  return {
    type: CONSTANTS.SEND_DEPOSIT_ERROR,
    error
  }
}

export function handleSendDeposit (nodeEth, addressSC, amount, tokenId, wallet, ethAddress,
  abiRollup, gasMultiplier, operatorUrl) {
  return async function (dispatch) {
    dispatch(sendDeposit())
    if (amount === '0') {
      dispatch(sendDepositError('Deposit Error: \'The amount must be greater than 0\''))
      return 'Deposit Error'
    } else {
      try {
        const babyjubToCompress = wallet.babyjubWallet.publicKeyCompressed.toString('hex')
        // eslint-disable-next-line new-cap
        const apiOperator = new operator.cliExternalOperator(operatorUrl)
        await apiOperator.getStateAccountByAddress(tokenId, babyjubToCompress)
        const resOperator = await apiOperator.getState()
        const currentBatch = resOperator.data.rollupSynch.lastBatchSynched
        const babyjubTo = [
          wallet.babyjubWallet.publicKey[0].toString(),
          wallet.babyjubWallet.publicKey[1].toString()
        ]
        const res = await rollup.onchain.depositOnTop.depositOnTop(nodeEth, addressSC, amount, tokenId,
          babyjubTo, wallet, abiRollup, gasLimit, gasMultiplier)
        dispatch(sendDepositSuccess(res, currentBatch))
        return { res, currentBatch }
      } catch (error) {
        try {
          if (error.message.includes('404')) {
            // eslint-disable-next-line new-cap
            const apiOperator = new operator.cliExternalOperator(operatorUrl)
            const resOperator = await apiOperator.getState()
            const currentBatch = resOperator.data.rollupSynch.lastBatchSynched
            const res = await rollup.onchain.deposit.deposit(nodeEth, addressSC, amount, tokenId, wallet,
              ethAddress, abiRollup, gasLimit, gasMultiplier)
            dispatch(sendDepositSuccess(res, currentBatch))
            return { res, currentBatch }
          } else {
            dispatch(sendDepositError(`Deposit Error: ${error.message}`))
            return error
          }
        } catch (error2) {
          dispatch(sendDepositError(`Deposit Error: ${error2.message}`))
          return error2
        }
      }
    }
  }
}

function sendWithdraw () {
  return {
    type: CONSTANTS.SEND_WITHDRAW
  }
}

function sendWithdrawSuccess (res, currentBatch) {
  return {
    type: CONSTANTS.SEND_WITHDRAW_SUCCESS,
    payload: { res, currentBatch },
    error: ''
  }
}

function sendWithdrawError (error) {
  return {
    type: CONSTANTS.SEND_WITHDRAW_ERROR,
    error
  }
}

export function handleSendWithdraw (nodeEth, addressSC, tokenId, wallet, abiRollup, op, numExitRoot, gasMultiplier) {
  return async function (dispatch) {
    dispatch(sendWithdraw())
    try {
      if (numExitRoot === -1) {
        dispatch(sendWithdrawError('The num exit root must be entered'))
        return 'No numExitRoot'
      } else {
        // eslint-disable-next-line new-cap
        const apiOperator = new operator.cliExternalOperator(op)
        const resOperator = await apiOperator.getState()
        const currentBatch = resOperator.data.rollupSynch.lastBatchSynched
        const res = await rollup.onchain.withdraw.withdraw(nodeEth, addressSC, tokenId, wallet, abiRollup,
          op, numExitRoot, gasLimit, gasMultiplier)
        abiDecoder.addABI(abiRollup)
        const web3 = new Web3(nodeEth)
        const txData = await web3.eth.getTransaction(res.hash)
        const decodedData = abiDecoder.decodeMethod(txData.input)
        const amount = decodedData.params.find((param) => {
          return param.name === 'amount'
        }).value
        dispatch(sendWithdrawSuccess(res, currentBatch))
        return { res, currentBatch, amount }
      }
    } catch (error) {
      dispatch(sendWithdrawError(`Withdraw Error: ${error.message}`))
      return error
    }
  }
}

function sendForceExit () {
  return {
    type: CONSTANTS.SEND_FORCE_EXIT
  }
}

function sendForceExitSuccess (res, currentBatch) {
  return {
    type: CONSTANTS.SEND_FORCE_EXIT_SUCCESS,
    payload: { res, currentBatch },
    error: ''
  }
}

function sendForceExitError (error) {
  return {
    type: CONSTANTS.SEND_FORCE_EXIT_ERROR,
    error
  }
}

export function handleSendForceExit (nodeEth, addressSC, tokenId, amount, wallet, abiRollup, urlOperator,
  gasMultiplier) {
  return async function (dispatch) {
    dispatch(sendForceExit())
    try {
      // eslint-disable-next-line new-cap
      const apiOperator = new operator.cliExternalOperator(urlOperator)
      const publicCompressed = wallet.babyjubWallet.publicKeyCompressed.toString('hex')
      const resAccount = await apiOperator.getStateAccountByAddress(tokenId, publicCompressed)
      let { address } = wallet.ethWallet
      if (!wallet.ethWallet.address.startsWith('0x')) {
        address = `0x${wallet.ethWallet.address}`
      }
      if (resAccount && resAccount.data.ethAddress.toUpperCase() === address.toUpperCase()) {
        const resOperator = await apiOperator.getState()
        const currentBatch = resOperator.data.rollupSynch.lastBatchSynched
        const res = await rollup.onchain.forceWithdraw.forceWithdraw(nodeEth, addressSC, tokenId,
          amount, wallet, abiRollup, gasLimit, gasMultiplier)
        dispatch(sendForceExitSuccess(res, currentBatch))
        return { res, currentBatch }
      } else {
        dispatch(sendForceExitError('This is not your ID'))
        return 'This is not your ID'
      }
    } catch (error) {
      dispatch(sendSendError(`Send Error: ${error.message}`))
      return error
    }
  }
}

function getIds () {
  return {
    type: CONSTANTS.GET_IDS
  }
}

function getIdsSuccess (res) {
  return {
    type: CONSTANTS.GET_IDS_SUCCESS,
    payload: res,
    error: ''
  }
}

function getIdsError (error) {
  return {
    type: CONSTANTS.GET_IDS_ERROR,
    error
  }
}

export function handleGetIds (urlOperator, filters, address) {
  return async function (dispatch) {
    dispatch(getIds())
    try {
      // eslint-disable-next-line new-cap
      const apiOperator = new operator.cliExternalOperator(urlOperator)
      const res = await apiOperator.getAccounts(filters)
      const ids = []
      res.data.map(async (key) => {
        ids.push({
          key: key.idx, value: key.idx, amount: key.amount, text: key.idx
        })
      })
      dispatch(getIdsSuccess(ids))
      return ids
    } catch (err) {
      dispatch(getIdsError(`There are no IDs associated with this address ${address}`))
      return []
    }
  }
}

function sendSend () {
  return {
    type: CONSTANTS.SEND_SEND
  }
}

function sendSendSuccess (nonce, currentBatch) {
  return {
    type: CONSTANTS.SEND_SEND_SUCCESS,
    payload: { nonce, currentBatch },
    error: ''
  }
}

function sendSendError (error) {
  return {
    type: CONSTANTS.SEND_SEND_ERROR,
    error
  }
}

export function handleSendSend (urlOperator, babyjubTo, amount, wallet, tokenId, fee) {
  return async function (dispatch) {
    dispatch(sendSend())
    try {
      if (fee === 0) {
        dispatch(sendSendError(
          'If a fee greater than 1 token is not entered,the operator will not forge the transaction'
        ))
        return 'If a fee greater than 1 token is not entered, the operator will not forge the transaction'
      } else {
        const item = localStorage.getItem('nonceObject')
        let nonceObject
        if (item === null) {
          nonceObject = undefined
        } else {
          nonceObject = JSON.parse(item)
        }
        // eslint-disable-next-line new-cap
        const apiOperator = new operator.cliExternalOperator(urlOperator)
        const babyjub = wallet.babyjubWallet.publicKeyCompressed.toString('hex')
        const resAccount = await apiOperator.getStateAccountByAddress(tokenId, babyjub)
        let { address } = wallet.ethWallet
        if (!wallet.ethWallet.address.startsWith('0x')) {
          address = `0x${wallet.ethWallet.address}`
        }
        if (resAccount && resAccount.data.ethAddress.toUpperCase() === address.toUpperCase()) {
          const resOperator = await apiOperator.getState()
          const currentBatch = resOperator.data.rollupSynch.lastBatchSynched
          let babyjubToAxAy
          if (babyjubTo === 'exit') {
            babyjubToAxAy = [exitAx, exitAy]
          } else {
            babyjubToAxAy = hexToPoint(babyjubTo)
          }
          const res = await rollup.offchain.send.send(urlOperator, babyjubToAxAy, amount, wallet, tokenId,
            fee, undefined, nonceObject, address)
          localStorage.setItem('nonceObject', JSON.stringify(res.nonceObject))
          dispatch(sendSendSuccess(res.nonce, currentBatch))
          return res
        } else {
          dispatch(sendSendError('You do not have this token in rollup'))
          return 'You do not have this token in rollup'
        }
      }
    } catch (error) {
      dispatch(sendSendError(`Send Error: ${error.message}`))
      return error
    }
  }
}

function approve () {
  return {
    type: CONSTANTS.APPROVE
  }
}

function approveSuccess (res) {
  return {
    type: CONSTANTS.APPROVE_SUCCESS,
    payload: res,
    error: ''
  }
}

function approveError (error) {
  return {
    type: CONSTANTS.APPROVE_ERROR,
    error
  }
}

export function handleApprove (addressTokens, abiTokens, wallet, amountToken, addressRollup,
  node, gasMultiplier) {
  return async function (dispatch) {
    dispatch(approve())
    try {
      if (amountToken === '0') {
        dispatch(approveError('The amount of tokens must be greater than 0'))
        return 'Approve Error'
      } else {
        const provider = new ethers.providers.JsonRpcProvider(node)
        let walletEth = new ethers.Wallet(wallet.ethWallet.privateKey)
        walletEth = walletEth.connect(provider)
        const contractTokens = new ethers.Contract(addressTokens, abiTokens, walletEth)
        const gasPrice = await rollup.onchain.utils.getGasPrice(gasMultiplier, provider)
        const overrides = {
          gasLimit,
          gasPrice: gasPrice._hex
        }
        const res = await contractTokens.approve(addressRollup, amountToken, overrides)
        dispatch(approveSuccess(res))
        return res
      }
    } catch (error) {
      dispatch(approveError(`Approve Error: ${error.message}`))
      return error.message
    }
  }
}

function getTokens () {
  return {
    type: CONSTANTS.GET_TOKENS
  }
}

function getTokensSuccess (res) {
  return {
    type: CONSTANTS.GET_TOKENS_SUCCESS,
    payload: res,
    error: ''
  }
}

function getTokensError (error) {
  return {
    type: CONSTANTS.GET_TOKENS_ERROR,
    error
  }
}

export function handleGetTokens (node, addressTokens, wallet) {
  return async function (dispatch) {
    dispatch(getTokens())
    try {
      const provider = new ethers.providers.JsonRpcProvider(node)
      let walletEth = new ethers.Wallet(wallet.ethWallet.privateKey)
      walletEth = walletEth.connect(provider)
      const tx = {
        to: addressTokens,
        value: ethers.utils.parseEther('0')
      }
      const res = await walletEth.sendTransaction(tx)
      dispatch(getTokensSuccess(res))
      return res
    } catch (error) {
      dispatch(getTokensError(`Get Tokens Error: ${error.message}`))
      return error
    }
  }
}

function getInitStateTx () {
  return {
    type: CONSTANTS.GET_INIT
  }
}

export function handleInitStateTx () {
  return function (dispatch) {
    localStorage.clear()
    dispatch(getInitStateTx())
  }
}

function closeMessage () {
  return {
    type: CONSTANTS.CLOSE_MESSAGE
  }
}

export function handleCloseMessage () {
  return function (dispatch) {
    dispatch(closeMessage())
  }
}