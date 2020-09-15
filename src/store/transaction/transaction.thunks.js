import ethers from 'ethers'

import * as transactionActions from './transaction.actions'
import { ETHER_TOKEN_ID } from '../../constants'

/**
 * Fetches token balances in the user's MetaMask account. Only for those tokens registered in Hermez and Ether.
 * Dispatch an array of { balance, token } where balance is a Number and token is the Token schema returned from the API.
 * Dispatch an error if the user has no balances for any registered token in Hermez or an error comes up from fetching the balances on-chain.
 */
function fetchMetaMaskTokens () {
  return async function (dispatch, getState) {
    dispatch(transactionActions.loadMetaMaskTokens())
    const { global: { tokensTask }, account: { metaMaskWalletTask } } = getState()
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
    for (const token of tokensTask.data) {
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
          contract.balanceOf(metaMaskWalletTask.data.ethereumAddress)
            // We can ignore if a call to the contract of a specific token fails.
            .catch(() => {})
        )
      }
    }
    try {
      const balances = (await Promise.all(balancePromises))
        .map((tokenBalance, index) => {
          const tokenData = tokensTask.data[index]
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
  }
}

export {
  fetchMetaMaskTokens
}
