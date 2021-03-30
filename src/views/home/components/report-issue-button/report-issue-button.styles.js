import { createUseStyles } from 'react-jss'

const reportIssueButtonStyles = createUseStyles((theme) => ({
  root: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    borderTop: `0.5px solid ${theme.palette.grey.veryLight}`,
    background: theme.palette.white
  },
  text: {
    width: '100%',
    textAlign: 'center',
    fontWeight: theme.fontWeights.medium,
    color: theme.palette.grey.main,
    padding: `${theme.spacing(1.5)}px 0`
  }
}))

export default reportIssueButtonStyles