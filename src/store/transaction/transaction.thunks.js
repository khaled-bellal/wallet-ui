import ethers from 'ethers'

import * as transactionActions from './transaction.actions'
import * as rollupApi from '../../apis/rollup'
import { ETHER_TOKEN_ID } from '../../constants'

/**
 * Fetches all registered tokens in Hermez.
 */
function fetchTokens () {
  return (dispatch) => {
    dispatch(transactionActions.loadTokens())

    return rollupApi.getTokens()
      .then(res => dispatch(transactionActions.loadTokensSuccess(res)))
      .catch(err => dispatch(transactionActions.loadTokensFailure(err)))
  }
}

/**
 * Fetches token balances in the user's MetaMask account. Only for those tokens registered in Hermez and Ether.
 * Dispatch an array of { balance, token } where balance is a Number and token is the Token schema returned from the API.
 * Dispatch an error if the user has no balances for any registered token in Hermez or an error comes up from fetching the balances on-chain.
 *
 * @param {Array} hermezTokens - List of registered tokens in Hermez
 */
function fetchMetaMaskTokens (hermezTokens) {
  return async function (dispatch, getState) {
    dispatch(transactionActions.loadMetaMaskTokens())
    const { account: { metaMaskWalletTask } } = getState()

    if (metaMaskWalletTask.status === 'successful') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const partialERC20ABI = [{
        constant: true,
        inputs: [
          {
            name: '_owner',
            type: 'address'
          }
        ],
        name: 'balanceOf',
        outputs: [
          {
            name: 'balance',
            type: 'uint256'
          }
        ],
        payable: false,
        type: 'function'
      }]
      const balancePromises = []
      for (const token of hermezTokens) {
        if (token.tokenId === ETHER_TOKEN_ID) {
          // tokenID 0 is for Ether
          const signer = provider.getSigner()
          balancePromises.push(
            signer.getBalance()
          )
        } else {
          // For ERC 20 tokens, check the balance from the smart contract
          const contract = new ethers.Contract(token.ethAddr, partialERC20ABI, provider)
          balancePromises.push(
            contract.balanceOf(metaMaskWalletTask.data.hermezEthereumAddress)
              // We can ignore if a call to the contract of a specific token fails.
              .catch(() => {})
          )
        }
      }

      try {
        const balances = (await Promise.all(balancePromises))
          .map((tokenBalance, index) => {
            const tokenData = hermezTokens[index]
            return {
              balance: Number(tokenBalance) / (Math.pow(10, tokenData.decimals)),
              token: tokenData
            }
          })
          .filter((account) => Number(account.balance) > 0)

        if (balances.length === 0) {
          dispatch(transactionActions.loadMetaMaskTokensFailure('You don\'t have any ERC 20 tokens in your MetaMask account that are registered in Hermez.'))
        } else {
          dispatch(transactionActions.loadMetaMaskTokensSuccess(balances))
        }
      } catch (error) {
        dispatch(transactionActions.loadMetaMaskTokensFailure(error))
      }
    } else {
      dispatch(transactionActions.loadMetaMaskTokensFailure('MetaMask wallet has not loaded'))
    }
  }
}

function fetchFees () {
  return async function (dispatch) {
    dispatch(transactionActions.loadFees())

    return rollupApi.getFees()
      .then(res => dispatch(transactionActions.loadFeesSuccess(res)))
      .catch(err => dispatch(transactionActions.loadFeesFailure(err)))
  }
}

export {
  fetchTokens,
  fetchMetaMaskTokens,
  fetchFees
}