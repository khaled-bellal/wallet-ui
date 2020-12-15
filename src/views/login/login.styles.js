import { createUseStyles } from 'react-jss'

const useLoginStyles = createUseStyles(theme => ({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: theme.palette.primary.main,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  goBackButton: {
    position: 'absolute',
    top: theme.spacing(2),
    right: 0,
    display: 'flex',
    background: 'transparent',
    border: 0,
    outline: 'none',
    cursor: 'pointer',
    padding: theme.spacing(1),
    marginRight: -theme.spacing(1)
  },
  goBackButtonIcon: {

  },
  logo: {
    marginTop: theme.spacing(6),
    marginBottom: theme.spacing(12),
    [theme.breakpoints.upSm]: {
      marginTop: theme.spacing(9)
    }
  },
  connectText: {
    fontSize: theme.spacing(2.5),
    fontWeight: theme.fontWeights.normal,
    marginBottom: theme.spacing(6)
  },
  addAccountText: {
    fontSize: theme.spacing(2.5),
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing(6)
  },
  connectedText: {
    fontSize: theme.spacing(2.5),
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing(4.5)
  }
}))

export default useLoginStyles
