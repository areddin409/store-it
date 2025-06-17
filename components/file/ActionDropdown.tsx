'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Models } from 'node-appwrite';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import {
  deleteFile,
  renameFile,
  updateFileUsers,
} from '@/lib/actions/file.actions';

import CustomDropdownMenu from '../CustomDropdownMenu';
import { FileDetails, ShareInput } from './ActionsModalContent';
import { toast } from 'sonner';

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
  };

  // Helper function to handle error responses
  const handleErrorResponse = (result: any) => {
    if (
      !result ||
      typeof result !== 'object' ||
      !('status' in result) ||
      result.status !== 'error'
    ) {
      return false;
    }

    // Error message mapping
    const errorMessages = {
      'Only the file owner can delete this file': `You don't have permission to delete this file. Only the owner can delete files.`,
      'Only the file owner can rename this file': `You don't have permission to rename this file. Only the owner can rename files.`,
      'Only the file owner can update sharing permissions': `You don't have permission to share this file. Only the owner can modify sharing settings.`,
    };

    // Get appropriate error message or use default
    const errorMessage =
      errorMessages[result.message as keyof typeof errorMessages] ||
      result.message ||
      `Failed to ${action?.value} file`;

    toast.error(errorMessage);
    return true;
  };

  // Helper function to show success messages
  const showSuccessMessage = (actionType: string) => {
    const successMessages = {
      rename: `File renamed to "${name}" successfully`,
      share: `File shared successfully`,
      delete: `File "${file.name}" deleted successfully`,
      default: 'Action completed successfully',
    };

    toast.success(
      successMessages[actionType as keyof typeof successMessages] ||
        successMessages.default
    );
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);

    try {
      // Map of action functions
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

      // Execute the selected action
      const result = await actions[action.value as keyof typeof actions]();

      // Handle error response if present
      if (handleErrorResponse(result)) {
        setIsLoading(false);
        closeModal();
        return;
      }

      // Handle success
      if (result) {
        showSuccessMessage(action.value);
        closeModal();
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error(`Failed to ${action.value} file. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAction();
    }
  };
  const handleRemoveUser = async (email: string) => {
    const updatedEmails = emails.filter(e => e !== email);

    try {
      const result = await updateFileUsers({
        fileId: file.$id,
        emails: updatedEmails,
        path,
      });

      // Use the same error handling helper function
      if (handleErrorResponse(result)) {
        return;
      }

      if (result) {
        setEmails(updatedEmails);
        toast.success(`User ${email} removed successfully`);
        closeModal();
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast.error(`Failed to remove user. Please try again.`);
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
              onKeyDown={handleKeyDown}
            />
          )}
          {value === 'details' && <FileDetails file={file} />}
          {value === 'share' && (
            <ShareInput
              file={file}
              onInputChange={setEmails}
              onRemove={handleRemoveUser}
              onKeyDown={handleKeyDown}
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
