import React from 'react'
import PropTypes from 'prop-types'

import useTransactionStyles from './transaction.styles'

function Transaction ({
  id,
  type,
  amount,
  currency,
  date,
  toAddress,
  onClick
}) {
  const classes = useTransactionStyles()

  function handleClick () {
    onClick(id)
  }

  return (
    <div className={classes.root} onClick={handleClick}>
      <div className={classes.typeContainer}>
        <p className={classes.type}>{type.charAt(0)}</p>
      </div>
      <div>
        <h3 className={classes.amount}>{amount} {currency}</h3>
        <p className={classes.date}>{date}</p>
      </div>
    </div>
  )
}

Transaction.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  amount: PropTypes.number.isRequired,
  currency: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
}

export default Transaction
