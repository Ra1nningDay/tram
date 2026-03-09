import { AdminAccessContent } from "@/components/admin/AdminAccessContent";
import { getAdminAccessData } from "@/lib/admin/access";

export default async function AdminAccessPage() {
  const access = await getAdminAccessData();

  return <AdminAccessContent access={access} />;
}
