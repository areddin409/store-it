'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from './ui/separator';
import { navItems } from '@/constants';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import FileUploader from './FileUploader';
import { Button } from './ui/button';

interface Props {
  ownerId: string;
  accountId: string;
  fullName: string;
  email: string;
  avatar: string;
}

const MobileNav = ({ ownerId, accountId, fullName, email, avatar }: Props) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="mobile-header">
      <Image
        src="/assets/icons/logo-full-brand.svg"
        alt="Logo"
        width={120}
        height={52}
        className="h-auto"
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Image
            src="/assets/icons/menu.svg"
            alt="Search"
            width={30}
            height={30}
          />
        </SheetTrigger>
        <SheetContent className="shad-sheet h-screen px-3">
          <SheetTitle>
            <div className="header-user">
              <Image
                src={avatar}
                alt="User Avatar"
                width={44}
                height={44}
                className="header-user-avatar"
              />
              <div className="sm:hidden lg:block">
                <p className="subtitle-2 capitalize">{fullName}</p>
                <p className="caption">{email}</p>
              </div>
            </div>
            <Separator className="mb-4 bg-light-200/20" />
          </SheetTitle>

          <nav className="mobile-nav">
            <ul className="mobile-nav-list">
              {navItems.map(({ url, name, icon }) => (
                <Link href={url} key={name} className="lg:w-full">
                  <li
                    className={cn(
                      'mobile-nav-item',
                      pathname === url && 'shad-active'
                    )}
                  >
                    <Image
                      src={icon}
                      alt={`${name} Icon`}
                      width={24}
                      height={24}
                      className={cn(
                        'nav-icon',
                        pathname === url && 'nav-icon-active'
                      )}
                    />
                    <p>{name}</p>
                  </li>
                </Link>
              ))}
            </ul>
          </nav>

          <Separator className="my-5 bg-light-200/20" />

          <div className="flex flex-col justify-between gap-5 pb-5">
            <FileUploader />

            <Button
              type="submit"
              className="mobile-sign-out-button"
              onClick={() => {}}
            >
              <Image
                src="/assets/icons/logout.svg"
                alt="Sign Out"
                width={24}
                height={24}
              />
              <p>Logout</p>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default MobileNav;
