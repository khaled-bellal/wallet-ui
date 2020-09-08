import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { fetchMetaMaskTokens } from '../../store/deposit/deposit.thunks'
import withAuthGuard from '../shared/with-auth-guard/with-auth-guard.view'
import TransactionLayout from '../shared/transaction-layout/transaction-layout.view'

function Deposit ({
  metaMaskTokensTask,
  selectedToken,
  onLoadMetaMaskTokens
}) {
  React.useEffect(() => {
    onLoadMetaMaskTokens()
  }, [onLoadMetaMaskTokens])

  return (
    <TransactionLayout
      tokensTask={metaMaskTokensTask}
      selectedToken={selectedToken}
      type='deposit'
    />
  )
}

Deposit.propTypes = {
  metaMaskTokensTask: PropTypes.shape({
    status: PropTypes.string.isRequired,
    data: PropTypes.arrayOf(
      PropTypes.shape({
        balance: PropTypes.number.isRequired,
        tokenId: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        symbol: PropTypes.string.isRequired,
        decimals: PropTypes.number.isRequired,
        ethAddr: PropTypes.string.isRequired,
        ethBlockNum: PropTypes.number.isRequired
      })
    )
  }),
  selectedToken: PropTypes.shape({
    balance: PropTypes.number.isRequired,
    tokenId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    decimals: PropTypes.number.isRequired,
    ethAddr: PropTypes.string.isRequired,
    ethBlockNum: PropTypes.number.isRequired
  })
}

const mapStateToProps = (state) => ({
  metaMaskTokensTask: state.deposit.metaMaskTokensTask
})

const mapDispatchToProps = (dispatch) => ({
  onLoadMetaMaskTokens: () => dispatch(fetchMetaMaskTokens())
})

export default withAuthGuard(connect(mapStateToProps, mapDispatchToProps)(Deposit))