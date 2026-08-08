import { useState } from "react";
import { BasePopup, CriteriaMinimum, Scope, useCreateGenre } from "@behindthemusictree/app-kit";

type GenreCreationPopupProps = {
  parent: CriteriaMinimum | null;
  scope: Scope;
  getBackendBaseUrl: () => string;
  onClose: () => void;
};

export default function GenreCreationPopup({ parent, scope, getBackendBaseUrl, onClose }: GenreCreationPopupProps) {
  const [name, setName] = useState("");
  const { mutate: createGenre, formErrors } = useCreateGenre(scope, getBackendBaseUrl);

  const submit = () => createGenre({ name, parent: parent?.uuid || undefined }, { onSuccess: onClose });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <BasePopup
      title="Create Genre"
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
