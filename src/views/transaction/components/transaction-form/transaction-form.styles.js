import { createUseStyles } from 'react-jss'

function errorMessage (theme) {
  return {
    display: 'none',
    alignItems: 'center',
    marginTop: `${theme.spacing(1.5)}px`,
    fontSize: `${theme.spacing(2)}px`,
    fontWeight: theme.fontWeights.medium,
    color: theme.palette.red
  }
}

const useAccountListStyles = createUseStyles(theme => ({
  transaction: {},
  token: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.palette.grey.light,
    borderRadius: 12,
    height: `${theme.spacing(10)}px`,
    marginBottom: `${theme.spacing(6)}px`,
    padding: `${theme.spacing(4)}px ${theme.spacing(5)}px`,
    fontSize: `${theme.spacing(2.5)}px`,
    fontWeight: theme.fontWeights.bold,
    color: theme.palette.black.dark
  },
  selectAmount: {
    border: `solid 2px ${theme.palette.grey.veryLight}`,
    borderRadius: 12
  },
  selectAmountError: {
    borderColor: theme.palette.red
  },
  amount: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: `${theme.spacing(5.5)}px`
  },
  amountCurrency: {
    margin: `0 0 ${theme.spacing(1.5)}px`,
    fontSize: `${theme.spacing(3)}px`,
    fontWeight: theme.fontWeights.bold,
    color: theme.palette.black.light
  },
  amountInput: {
    border: 0,
    outline: 'none',
    caretColor: theme.palette.orange,
    fontSize: `${theme.spacing(6)}px`,
    fontWeight: theme.fontWeights.bold,
    color: theme.palette.black.dark,
    textAlign: 'center',
    '&::-webkit-outer-spin-button,&::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0
    },
    '&[type=number]': {
      '-moz-appearance': 'textfield'
    }
  },
  amountButtons: {
    display: 'flex'
  },
  amountButton: {
    cursor: 'pointer',
    background: 'none',
    outline: 'none',
    border: '0',
    borderTop: `solid 2px ${theme.palette.grey.veryLight}`,
    fontSize: `${theme.spacing(3)}px`,
    fontWeight: theme.fontWeights.bold,
    color: theme.palette.grey.main,
    flex: 1,
    padding: `${theme.spacing(3.5)}px 0`
  },
  sendAll: {
    borderRight: `solid 2px ${theme.palette.grey.veryLight}`
  },
  changeCurrency: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  changeCurrencyIcon: {
    marginRight: `${theme.spacing(1)}px`
  },
  selectAmountErrorMessage: errorMessage(theme),
  selectAmountErrorMessageVisible: {
    display: 'flex'
  },
  errorIcon: {
    marginRight: `${theme.spacing(1)}px`,
    width: `${theme.spacing(2.5)}px`,
    height: `${theme.spacing(2.5)}px`
  },
  receiverInputWrapper: {
    width: '100%',
    position: 'relative',
    marginTop: `${theme.spacing(5)}px`
  },
  receiver: {
    width: '100%',
    borderRadius: 12,
    border: `solid 2px ${theme.palette.grey.veryLight}`,
    padding: `${theme.spacing(5.5)}px ${theme.spacing(5) + 30}px ${theme.spacing(5.5)}px ${theme.spacing(5)}px`,
    fontSize: `${theme.spacing(3)}px`,
    color: theme.palette.black.dark,
    fontWeight: theme.fontWeights.medium,
    outline: 0,
    '&::placeholder': {
      color: theme.palette.grey.main,
      opacity: 1
    }
  },
  receiverError: {
    borderColor: theme.palette.red
  },
  receiverErrorMessage: errorMessage(theme),
  receiverErrorMessageVisible: {
    display: 'flex'
  },
  receiverPaste: {
    position: 'absolute',
    right: `${theme.spacing(5)}px`,
    top: 0,
    height: '100%',
    alignItems: 'center',
    border: 0,
    background: 0,
    outline: 'none',
    padding: 0,
    fontSize: `${theme.spacing(2.5)}px`,
    fontWeight: theme.fontWeights.bold,
    color: theme.palette.black.dark,
    cursor: 'pointer',
    display: 'none'
  },
  receiverPasteVisible: {
    display: 'flex'
  },
  receiverDelete: {
    position: 'absolute',
    right: `${theme.spacing(5)}px`,
    top: 0,
    height: '100%',
    alignItems: 'center',
    border: 0,
    background: 0,
    outline: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'none'
  },
  receiverDeleteVisible: {
    display: 'flex'
  },
  receiverDeleteIcon: {
    width: 30,
    height: 30
  },
  continue: {
    cursor: 'pointer',
    width: '100%',
    marginTop: `${theme.spacing(14.5)}px`,
    padding: `${theme.spacing(3.5)}px 0`,
    backgroundColor: theme.palette.secondary,
    border: 0,
    outline: 'none',
    borderRadius: 14,
    fontSize: `${theme.spacing(3)}px`,
    fontWeight: theme.fontWeights.bold,
    color: theme.palette.white,
    '&[disabled]': {
      backgroundColor: theme.palette.grey.main,
      cursor: 'normal'
    }
  },
  feeWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    cursor: 'pointer',
    marginTop: `${theme.spacing(4.5)}px`
  },
  fee: {
    fontSize: `${theme.spacing(3)}px`,
    fontWeight: theme.fontWeights.medium,
    color: theme.palette.grey.main,
    marginBottom: `${theme.spacing(1)}px`
  },
  feeIcon: {
    width: `${theme.spacing(2)}px`,
    height: `${theme.spacing(2)}px`
  }
}))

export default useAccountListStyles
