import { AdminActivityContent } from "@/components/admin/AdminActivityContent";
import { getAdminActivityData } from "@/lib/admin/activity";

export default async function AdminActivityPage() {
  const activity = await getAdminActivityData();

  return <AdminActivityContent activity={activity} />;
}
