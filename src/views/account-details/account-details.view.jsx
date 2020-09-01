import React from 'react'
import PropTypes from 'prop-types'
import { useParams, useHistory } from 'react-router-dom'
import { connect } from 'react-redux'

import useAccountDetailsStyles from './account-details.styles'
import { fetchAccount, fetchTransactions } from '../../store/account-details/account-details.thunks'
import Spinner from '../shared/spinner/spinner.view'
import TransactionList from './components/transaction-list/transaction-list.view'
import withAuthGuard from '../shared/with-auth-guard/with-auth-guard.view'

function AccountDetails ({
  metaMaskWalletTask,
  preferredCurrency,
  accountTask,
  transactionsTask,
  tokensTask,
  onLoadAccount,
  onLoadTransactions
}) {
  const classes = useAccountDetailsStyles()
  const history = useHistory()
  const { tokenId } = useParams()

  React.useEffect(() => {
    if (metaMaskWalletTask.status === 'successful') {
      onLoadAccount(metaMaskWalletTask.data.ethereumAddress, tokenId)
      onLoadTransactions(metaMaskWalletTask.data.ethereumAddress, tokenId)
    }
  }, [metaMaskWalletTask, tokenId, onLoadAccount, onLoadTransactions])

  if (metaMaskWalletTask.status === 'pending') {
    history.replace('/')
  }

  function getTokenName (tokens, tokenId) {
    const tokenData = tokens.find(token => token.TokenID === tokenId)

    return tokenData?.Name
  }

  function handleTransactionClick (transactionId) {
    history.push(`/accounts/${tokenId}/transactions/${transactionId}`)
  }

  return (
    <div>
      {(() => {
        switch (tokensTask.status) {
          case 'loading': {
            return <Spinner />
          }
          case 'failed': {
            return <p>{tokensTask.error}</p>
          }
          case 'successful': {
            return (
              <>
                <section>
                  {(() => {
                    switch (accountTask.status) {
                      case 'loading': {
                        return <Spinner />
                      }
                      case 'failed': {
                        return <p>{accountTask.error}</p>
                      }
                      case 'successful': {
                        return (
                          <div>
                            <h3>{getTokenName(tokensTask.data, accountTask.data.TokenID)}</h3>
                            <h1>{accountTask.data.Balance}</h1>
                            <p>- {preferredCurrency}</p>
                          </div>
                        )
                      }
                      default: {
                        return <></>
                      }
                    }
                  })()}
                  <div className={classes.actionButtonsGroup}>
                    <button className={classes.actionButton}>Send</button>
                    <button className={classes.actionButton}>Add funds</button>
                    <button className={classes.actionButton}>Withdrawal</button>
                  </div>
                </section>
                <section>
                  <h4 className={classes.title}>Activity</h4>
                  {(() => {
                    switch (transactionsTask.status) {
                      case 'loading': {
                        return <Spinner />
                      }
                      case 'failed': {
                        return <p>{transactionsTask.error}</p>
                      }
                      case 'successful': {
                        return (
                          <TransactionList
                            transactions={transactionsTask.data}
                            tokens={tokensTask.data}
                            onTransactionClick={handleTransactionClick}
                          />
                        )
                      }
                      default: {
                        return <></>
                      }
                    }
                  })()}
                </section>
              </>
            )
          }
          default: {
            return <></>
          }
        }
      })()}
    </div>
  )
}

AccountDetails.propTypes = {
  preferredCurrency: PropTypes.number.isRequired,
  accountTask: PropTypes.shape({
    status: PropTypes.string.isRequired,
    data: PropTypes.shape({
      Balance: PropTypes.number.isRequired,
      TokenID: PropTypes.number.isRequired
    }),
    error: PropTypes.string
  }),
  transactionsTask: PropTypes.shape({
    status: PropTypes.string.isRequired,
    data: PropTypes.arrayOf(
      PropTypes.shape({
        TxID: PropTypes.string.isRequired,
        Type: PropTypes.string.isRequired,
        Amount: PropTypes.number.isRequired,
        TokenID: PropTypes.number.isRequired
      })
    ),
    error: PropTypes.string
  }),
  tokensTask: PropTypes.shape({
    status: PropTypes.string.isRequired,
    data: PropTypes.arrayOf(
      PropTypes.shape({
        TokenID: PropTypes.number.isRequired,
        Name: PropTypes.string.isRequired,
        Symbol: PropTypes.string.isRequired
      })
    )
  }),
  onLoadAccount: PropTypes.func.isRequired
}

const mapStateToProps = (state) => ({
  metaMaskWalletTask: state.account.metaMaskWalletTask,
  preferredCurrency: state.settings.preferredCurrency,
  accountTask: state.accountDetails.accountTask,
  transactionsTask: state.accountDetails.transactionsTask,
  tokensTask: state.global.tokensTask
})

const mapDispatchToProps = (dispatch) => ({
  onLoadAccount: (ethereumAddress, tokenId) => dispatch(fetchAccount(ethereumAddress, tokenId)),
  onLoadTransactions: (ethereumAddress, tokenId) => dispatch(fetchTransactions(ethereumAddress, tokenId))
})

export default withAuthGuard(connect(mapStateToProps, mapDispatchToProps)(AccountDetails))
