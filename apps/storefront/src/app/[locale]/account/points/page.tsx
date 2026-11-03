import { accountMetadata, accountPage, type AccountPageProps } from "../AccountRoute";
export const generateMetadata = (props: AccountPageProps) => accountMetadata(props, "points");
export default function Page(props: AccountPageProps) { return accountPage(props, "points"); }
