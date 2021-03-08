import { createUseStyles } from 'react-jss'

const useTransactionInfoRowStyles = createUseStyles(theme => ({
  root: {
    padding: `${theme.spacing(3.5)}px 0 ${theme.spacing(3)}px`,
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.grey.veryLight}`
  },
  title: {
    color: theme.palette.black.dark,
    fontWeight: theme.fontWeights.medium
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  copyButton: {
    display: 'flex',
    marginRight: theme.spacing(1),
    padding: theme.spacing(1),
    border: 0,
    background: theme.palette.grey.light,
    borderRadius: '50%',
    cursor: 'pointer',
    outline: 'none'
  },
  copyIcon: {
    width: 14,
    height: 14,
    '& path': {
      fill: theme.palette.secondary.main
    }
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.black.dark,
    fontWeight: theme.fontWeights.bold,
    marginBottom: `${theme.spacing(1.5)}px`
  },
  value: {
    color: theme.palette.grey.main,
    fontWeight: theme.fontWeights.medium
  }
}))

export default useTransactionInfoRowStyles
