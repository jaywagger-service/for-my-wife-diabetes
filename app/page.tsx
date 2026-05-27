// import { HomeClient } from "@/components/HomeClient";

// export default function Page() {
//   return <HomeClient />;
// }

import dynamic from "next/dynamic";

const HomeClient = dynamic(
  () => import("@/components/HomeClient").then((m) => m.HomeClient),
  { ssr: false }
);

export default function Page() {
  return <HomeClient />;
}