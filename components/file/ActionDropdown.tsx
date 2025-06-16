'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Models } from 'node-appwrite';
import { actionsDropdownItems } from '@/constants';
import Link from 'next/link';
import { constructDownloadUrl } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  deleteFile,
  renameFile,
  updateFileUsers,
} from '@/lib/actions/file.actions';
import { usePathname } from 'next/navigation';
import { FileDetails, ShareInput } from './ActionsModalContent';
import CustomDropdownMenu from '../CustomDropdownMenu';

const ActionDropdown = ({ file }: { file: Models.Document }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(file.name);
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [forceRender, setForceRender] = useState(0);

  const path = usePathname();

  // Force a re-render of the dropdown after modal closes
  useEffect(() => {
    if (!isModalOpen) {
      // Reset the action after modal closes
      const timer = setTimeout(() => {
        setAction(null);
        setName(file.name);
        // setEmails([]);

        // Force a re-render of the dropdown after a brief delay
        setTimeout(() => {
          setForceRender(prev => prev + 1);
        }, 50);

        // Reset body styles to ensure page is interactive
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isModalOpen, file.name]);

  const closeModal = () => {
    setIsModalOpen(false);
    // Don't set dropdown state here, let the effect handle it
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);
    let success = false;

    try {
      const actions = {
        rename: () =>
          renameFile({
            fileId: file.$id,
            name,
            extension: file.extension,
            path,
          }),
        share: () => updateFileUsers({ fileId: file.$id, emails, path }),
        delete: () =>
          deleteFile({
            fileId: file.$id,
            bucketFileId: file.bucketFileId,
            path,
          }),
      };

      success = await actions[action.value as keyof typeof actions]();

      if (success) closeModal();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    const updatedEmails = emails.filter(e => e !== email);

    try {
      const success = await updateFileUsers({
        fileId: file.$id,
        emails: updatedEmails,
        path,
      });

      if (success) setEmails(updatedEmails);
      closeModal();
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  };

  const renderDialogContent = () => {
    if (!action) return null;

    const { value, label } = action;

    return (
      <DialogContent className="shad-dialog button">
        <DialogHeader className="flex flex-col gap-3">
          <DialogTitle className="text-center text-light-100">
            {label}
          </DialogTitle>
          {value === 'rename' && (
            <Input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          {value === 'details' && <FileDetails file={file} />}
          {value === 'share' && (
            <ShareInput
              file={file}
              onInputChange={setEmails}
              onRemove={handleRemoveUser}
            />
          )}
          {value === 'delete' && (
            <p className="delete-confirmation">
              Are you sure you want to delete{` `}
              <span className="delete-file-name">{file.name}</span>?
            </p>
          )}
        </DialogHeader>
        {['rename', 'delete', 'share'].includes(value) && (
          <DialogFooter className="flex flex-col gap-3 md:flex-row">
            <Button onClick={closeModal} className="modal-cancel-button">
              Cancel
            </Button>
            <Button onClick={handleAction} className="modal-submit-button">
              <p className="capitalize">{value}</p>
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={24}
                  height={24}
                  className="animate-spin"
                />
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    );
  };

  // Add a key to force re-rendering of dropdown menu
  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={open => {
        setIsModalOpen(open);
        // Immediately reset body styles when dialog closes
        if (!open) {
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
        }
      }}
    >
      <CustomDropdownMenu
        key={`dropdown-${forceRender}`}
        isOpen={isDropdownOpen}
        setIsOpen={setIsDropdownOpen}
        file={file}
        setAction={setAction}
        setIsModalOpen={setIsModalOpen}
      />

      {renderDialogContent()}
    </Dialog>
  );
};

export default ActionDropdown;
