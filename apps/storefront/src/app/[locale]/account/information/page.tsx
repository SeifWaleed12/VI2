import { accountMetadata, accountPage, type AccountPageProps } from "../AccountRoute";
export const generateMetadata = (props: AccountPageProps) => accountMetadata(props, "information");
export default function Page(props: AccountPageProps) { return accountPage(props, "information"); }
