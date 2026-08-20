import { useState } from "react";
import { BasePopup, CriteriaMinimum, Scope, useUpdateGenre } from "@behindthemusictree/app-kit";

type GenreRenamePopupProps = {
  genre: CriteriaMinimum;
  scope: Scope;
  getBackendBaseUrl: () => string;
  onClose: () => void;
};

export default function GenreRenamePopup({ genre, scope, getBackendBaseUrl, onClose }: GenreRenamePopupProps) {
  const [name, setName] = useState(genre.name);
  const { renameGenre, formErrors } = useUpdateGenre(scope, getBackendBaseUrl);

  const submit = () => {
    renameGenre(genre.uuid, name);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <BasePopup
      title="Rename Genre"
      isDismissable
      showOkButton
      showCancelButton
      okButtonText="Save"
      onClose={onClose}
      onOk={submit}
      onCancel={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            autoFocus
          />
        </div>
        {formErrors && formErrors.length > 0 && (
          <div className="flex flex-col gap-1">
            {formErrors.map((error, index) => (
              <p key={`${error.field}-${index}`} className="text-red-500 text-sm">
                {error.message}
              </p>
            ))}
          </div>
        )}
      </form>
    </BasePopup>
  );
}
