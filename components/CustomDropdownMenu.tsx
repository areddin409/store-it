import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { actionsDropdownItems } from '@/constants';
import { constructDownloadUrl } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Models } from 'node-appwrite';

interface Props {
  file: Models.Document;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setIsModalOpen: (open: boolean) => void;
  setAction: (action: ActionType | null) => void;
}

const CustomDropdownMenu = ({
  file,
  isOpen: isDropdownOpen,
  setIsOpen: setIsDropdownOpen,
  setIsModalOpen,
  setAction,
}: Props) => {
  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger className="shad-no-focus hover:bg-light-100/10 rounded-xl p-1 transition-colors duration-200 ease-in-out">
        <Image src="/assets/icons/dots.svg" alt="dots" width={34} height={34} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="max-w-[200px] truncate">
          {file.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actionsDropdownItems.map(actionItem => (
          <DropdownMenuItem
            key={actionItem.value}
            className="shad-dropdown-item"
            onClick={() => {
              setAction(actionItem);

              if (
                ['rename', 'share', 'delete', 'details'].includes(
                  actionItem.value
                )
              ) {
                setIsModalOpen(true);
              }
            }}
          >
            {actionItem.value === 'download' ? (
              <Link
                href={constructDownloadUrl(file.bucketFileId)}
                download={file.name}
                className="flex items-center gap-2"
              >
                <Image
                  src={actionItem.icon}
                  alt={actionItem.label}
                  width={30}
                  height={30}
                />
                {actionItem.label}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Image
                  src={actionItem.icon}
                  alt={actionItem.label}
                  width={30}
                  height={30}
                />
                {actionItem.label}
              </div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CustomDropdownMenu;
