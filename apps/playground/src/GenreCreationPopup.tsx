import { useState } from "react";
import { BasePopup, CriteriaMinimum } from "@behindthemusictree/app-kit";

type GenreCreationPopupProps = {
  parent: CriteriaMinimum | null;
  onSubmit: (values: { name: string; parent?: string }) => void;
  onClose: () => void;
  formErrors?: { field: string; message: string }[];
};

export default function GenreCreationPopup({ parent, onSubmit, onClose, formErrors }: GenreCreationPopupProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, parent: parent?.uuid || undefined });
  };

  return (
    <BasePopup
      title="Create Genre"
      isDismissable
      showOkButton
      showCancelButton
      okButtonText="Save"
      onClose={onClose}
      onOk={() => onSubmit({ name, parent: parent?.uuid || undefined })}
      onCancel={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
          <input
            type="text"
            value={parent?.name || "(root genre)"}
            className="w-full px-3 py-2 border rounded-md"
            disabled
          />
        </div>
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
            {formErrors.map((error) => (
              <p key={error.field} className="text-red-500 text-sm">
                {error.message}
              </p>
            ))}
          </div>
        )}
      </form>
    </BasePopup>
  );
}
