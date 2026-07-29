import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { AvatarCategoryId } from "../../game/avatars";
import {
  avatarCategories,
  avatarOptionById,
  avatarsByCategory,
  type AvatarId,
} from "../../game/avatars";

type AvatarSetupCompactProps = {
  avatarId: AvatarId;
  onChangeClick: () => void;
};

export function AvatarSetupCompact({
  avatarId,
  onChangeClick,
}: AvatarSetupCompactProps) {
  const selected = avatarOptionById[avatarId];
  const category = avatarCategories.find(
    ({ id }) => id === selected.categoryId,
  );

  return (
    <div className="avatar-setup-compact">
      <img
        src={selected.previewUrl}
        alt=""
        className="avatar-setup-compact-thumb"
        width={44}
        height={44}
      />
      <div className="avatar-setup-compact-copy">
        <span className="avatar-setup-compact-label">Personaj</span>
        <strong>{selected.labelRo}</strong>
        {category ? (
          <span className="avatar-setup-compact-category">{category.labelRo}</span>
        ) : null}
      </div>
      <button
        type="button"
        className="text-button avatar-setup-change"
        onClick={onChangeClick}
      >
        Schimbă
      </button>
    </div>
  );
}

type AvatarPickerModalProps = {
  avatarId: AvatarId;
  playerName: string;
  onClose: () => void;
  onSelect: (avatarId: AvatarId) => void;
};

function AvatarPickerGrid({
  avatarId,
  onSelect,
}: {
  avatarId: AvatarId;
  onSelect: (avatarId: AvatarId) => void;
}) {
  const selected = avatarOptionById[avatarId];
  const [categoryId, setCategoryId] = useState<AvatarCategoryId>(
    selected.categoryId,
  );
  const options = avatarsByCategory[categoryId];

  useEffect(() => {
    setCategoryId(selected.categoryId);
  }, [selected.categoryId, avatarId]);

  return (
    <div className="avatar-setup">
      <div
        className="avatar-category-tabs"
        role="tablist"
        aria-label="Categorie personaj"
      >
        {avatarCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            id={`avatar-tab-${category.id}`}
            aria-selected={categoryId === category.id}
            className={
              categoryId === category.id
                ? "avatar-category-tab avatar-category-tab-active"
                : "avatar-category-tab"
            }
            onClick={() => setCategoryId(category.id)}
          >
            <category.Icon aria-hidden="true" size={16} />
            <span>{category.labelRo}</span>
          </button>
        ))}
      </div>

      <div
        className="avatar-options avatar-options-previews avatar-options-modal"
        role="tabpanel"
        aria-labelledby={`avatar-tab-${categoryId}`}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              avatarId === option.id
                ? "avatar-button avatar-button-active"
                : "avatar-button"
            }
            onClick={() => onSelect(option.id)}
            aria-pressed={avatarId === option.id}
            title={option.labelRo}
          >
            <img
              src={option.previewUrl}
              alt=""
              className="avatar-preview-thumb"
              width={40}
              height={40}
              loading="lazy"
            />
            <span>{option.labelRo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AvatarPickerModal({
  avatarId,
  playerName,
  onClose,
  onSelect,
}: AvatarPickerModalProps) {
  const trimmedName = playerName.trim();
  const titleId = "avatar-picker-dialog-title";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="avatar-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="avatar-picker-shell">
        <div className="avatar-picker-header">
          <div className="avatar-picker-title">
            <h2 id={titleId}>Alege personajul</h2>
            {trimmedName ? (
              <span className="avatar-picker-subtitle">{trimmedName}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="icon-button avatar-picker-close"
            onClick={onClose}
            aria-label="Închide"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <AvatarPickerGrid
          avatarId={avatarId}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
