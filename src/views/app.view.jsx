import React from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { useTheme } from 'react-jss'

import useAppStyles from './app.styles'
import Layout from './shared/layout/layout.view'
import routes from '../routing/routes'
import * as globalThunks from '../store/global/global.thunks'
import Spinner from './shared/spinner/spinner.view'
import { CurrencySymbol } from '../utils/currencies'

function App ({
  ethereumNetworkTask,
  fiatExchangeRatesTask,
  onSetHermezEnvironment,
  onLoadFiatExchangeRates,
  onChangeNetworkStatus,
  onOpenSnackbar,
  onDisconnectAccount,
  onReloadApp
}) {
  const theme = useTheme()
  const classes = useAppStyles()

  React.useEffect(() => {
    onSetHermezEnvironment()
  }, [onSetHermezEnvironment])

  React.useEffect(() => {
    onLoadFiatExchangeRates()
  }, [onLoadFiatExchangeRates])

  React.useEffect(() => {
    window.addEventListener('online', () => {
      onChangeNetworkStatus('online', theme.palette.green)
    })
  }, [theme, onChangeNetworkStatus])

  React.useEffect(() => {
    window.addEventListener('offline', () => onChangeNetworkStatus('offline'))
  }, [theme, onChangeNetworkStatus])

  React.useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => { onDisconnectAccount() })
      window.ethereum.on('chainChanged', () => { onReloadApp() })
    }
  }, [onDisconnectAccount, onReloadApp])

  if (
    fiatExchangeRatesTask.status !== 'successful' ||
    ethereumNetworkTask.status === 'pending' ||
    ethereumNetworkTask.status === 'loading'
  ) {
    return (
      <div className={classes.root}>
        <Spinner size={theme.spacing(8)} />
      </div>
    )
  }

  return (
    <Layout>
      <Switch>
        {routes.map(route =>
          <Route
            exact
            key={route.path}
            path={route.path}
            render={route.render}
          />
        )}
        <Redirect to='/' />
      </Switch>
    </Layout>
  )
}

App.propTypes = {
  fiatExchangeRatesTask: PropTypes.object
}

const mapStateToProps = (state) => ({
  ethereumNetworkTask: state.global.ethereumNetworkTask,
  fiatExchangeRatesTask: state.global.fiatExchangeRatesTask
})

const mapDispatchToProps = (dispatch) => ({
  onSetHermezEnvironment: () => dispatch(globalThunks.setHermezEnvironment()),
  onLoadFiatExchangeRates: () =>
    dispatch(
      globalThunks.fetchFiatExchangeRates(
        Object.values(CurrencySymbol)
          .filter(currency => currency.code !== CurrencySymbol.USD.code)
          .map((currency) => currency.code)
      )
    ),
  onChangeNetworkStatus: (networkStatus, backgroundColor) =>
    dispatch(globalThunks.changeNetworkStatus(networkStatus, backgroundColor)),
  onDisconnectAccount: () => dispatch(globalThunks.disconnectWallet()),
  onReloadApp: () => dispatch(globalThunks.reloadApp())
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
