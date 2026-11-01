import { requireSession } from "@/server/session";
import { HomeView } from "@/modules/home/ui/views/home-view";

const Page = async () => {
  await requireSession();

  return <HomeView />;
}
 
export default Page;