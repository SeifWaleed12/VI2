import { accountMetadata, accountPage, type AccountPageProps } from "../AccountRoute";
export const generateMetadata = (props: AccountPageProps) => accountMetadata(props, "orders");
export default function Page(props: AccountPageProps) { return accountPage(props, "orders"); }
