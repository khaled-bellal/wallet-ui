import { globalActionTypes } from './global.actions'

const initialGlobalState = {
  header: {
    type: 'main'
  },
  redirectRoute: '/',
  configTask: {
    status: 'pending'
  },
  fiatExchangeRatesTask: {
    status: 'pending'
  }
}

function globalReducer (state = initialGlobalState, action) {
  switch (action.type) {
    case globalActionTypes.CHANGE_HEADER: {
      return {
        ...state,
        header: action.header
      }
    }
    case globalActionTypes.CHANGE_REDIRECT_ROUTE: {
      return {
        ...state,
        redirectRoute: action.redirectRoute
      }
    }
    case globalActionTypes.LOAD_CONFIG:
      return {
        ...state,
        configTask: {
          status: 'loading'
        }
      }
    case globalActionTypes.LOAD_CONFIG_SUCCESS:
      return {
        ...state,
        configTask: {
          status: 'successful',
          data: action.config,
          error: action.error
        }
      }
    case globalActionTypes.LOAD_CONFIG_FAILURE:
      return {
        ...state,
        configTask: {
          status: 'failed',
          data: {
            chainId: -1,
            config: action.config
          },
          error: action.error
        }
      }
    case globalActionTypes.LOAD_FIAT_EXCHANGE_RATES: {
      return {
        ...state,
        fiatExchangeRatesTask: {
          status: 'loading'
        }
      }
    }
    case globalActionTypes.LOAD_FIAT_EXCHANGE_RATES_SUCCESS: {
      return {
        ...state,
        fiatExchangeRatesTask: {
          status: 'successful',
          data: action.fiatExchangeRates
        }
      }
    }
    case globalActionTypes.LOAD_FIAT_EXCHANGE_RATES_FAILURE: {
      return {
        ...state,
        fiatExchangeRatesTask: {
          status: 'failure',
          error: action.error
        }
      }
    }
    default: {
      return state
    }
  }
}

export default globalReducer
