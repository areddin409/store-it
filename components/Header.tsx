import Image from "next/image";

import { Button } from "@/components/ui/button";

import Search from "@/components/Search";
import FileUploader from "@/components/FileUploader";
import { signOUtUser } from "@/lib/actions/user.action";
import { HeaderProps } from "@/types";

const Header = ({ userId, accountId }: HeaderProps) => {
  return (
    <header className={"header"}>
      <Search />
      <div className={"header-wrapper"}>
        <FileUploader ownerId={userId} accountId={accountId} />
        <form
          action={async () => {
            "use server";

            await signOUtUser();
          }}
        >
          <Button type={"submit"} className={"sign-out-button"}>
            <Image
              src={"/assets/icons/logout.svg"}
              alt={"logo"}
              width={24}
              height={24}
              className={"w-6"}
            />
          </Button>
        </form>
      </div>
    </header>
  );
};
export default Header;
