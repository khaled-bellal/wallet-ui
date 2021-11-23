import Home from "../views/home/home.view";
import Login from "../views/login/login.view";
import Transfer from "../views/transactions/transfer/transfer.view";
import Deposit from "src/views/transactions/deposit/deposit.view";
import Exit from "src/views/transactions/exit/exit.view";
import Withdraw from "src/views/transactions/withdraw/withdraw.view";
import ForceExit from "src/views/transactions/force-exit/force-exit.view";
import MyAccount from "../views/my-account/my-account.view";
import AccountDetails from "../views/account-details/account-details.view";
import TransactionDetails from "../views/transaction-details/transaction-details.view";
import MyCode from "../views/my-code/my-code.view";
import TokenSwap from "../views/token-swap/token-swap.view";

const routes = {
  home: {
    path: "/",
    render: () => <Home />,
  },
  login: {
    path: "/login",
    isPublic: true,
    render: () => <Login />,
  },
  deposit: {
    path: "/deposit",
    render: () => <Deposit />,
  },
  transfer: {
    path: "/transfer",
    render: () => <Transfer />,
  },
  withdraw: {
    path: "/withdraw",
    render: () => <Exit />,
  },
  withdrawComplete: {
    path: "/withdraw-complete",
    render: () => <Withdraw />,
  },
  forceWithdraw: {
    path: "/force-withdraw",
    render: () => <ForceExit />,
  },
  myAccount: {
    path: "/my-account",
    render: () => <MyAccount />,
  },
  myCode: {
    path: "/my-code",
    render: () => <MyCode />,
  },
  accountDetails: {
    path: "/accounts/:accountIndex",
    render: () => <AccountDetails />,
  },
  transactionDetails: {
    path: "/accounts/:accountIndex/transactions/:transactionId",
    render: () => <TransactionDetails />,
  },
  tokenSwap: {
    path: "/token-swap",
    render: () => <TokenSwap />,
    isHidden: process.env.REACT_APP_ENABLE_TOKEN_SWAP !== "true",
  },
};

export default routes;
