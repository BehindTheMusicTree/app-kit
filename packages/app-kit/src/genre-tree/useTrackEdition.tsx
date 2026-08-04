"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUpdateUploadedTrack } from "./useUploadedTrack";
import UploadedTrackEditionPopup from "./UploadedTrackEditionPopup";
import { FORM_RATING_NULL_VALUE } from "./lib/rating";
import { Scope } from "../transport/lib/scope";
import { UploadedTrackDetailed } from "./schemas/uploaded-track/detailed";
import { UploadedTrackUpdateValues } from "./schemas/uploaded-track/form/update";

interface TrackEditionFormValues {
  title: string;
  artists_names: string;
  genre: string;
  album_name: string;
  rating: number | undefined;
}

export function useTrackEdition(scope: Scope | null, getBackendBaseUrl: () => string) {
  const [show, setShow] = useState(false);
  const [track, setTrack] = useState<UploadedTrackDetailed | null>(null);
  const { mutate: updateTrack, isSuccess, isError, data: updatedTrack, error } = useUpdateUploadedTrack(
    scope,
    getBackendBaseUrl,
  );

  const [formValues, setFormValues] = useState<TrackEditionFormValues>({
    title: "",
    artists_names: "",
    genre: "",
    album_name: "",
    rating: undefined,
  });

  const showEditPopup = (track: UploadedTrackDetailed) => {
    setTrack(track);
    setFormValues({
      title: track.title || "",
      artists_names: track.artists?.map((artist) => artist.name).join(", ") || "",
      genre: track.genre?.name || "",
      album_name: track.album?.name || "",
      rating: track.rating ?? undefined,
    });
    setShow(true);
  };

  useEffect(() => {
    if (isSuccess && updatedTrack) {
      setShow(false);
    }
  }, [isSuccess, updatedTrack]);

  useEffect(() => {
    if (isError && error) {
      // Close the edition popup when there's an error so the error popup can be displayed
      setShow(false);
    }
  }, [isError, error]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!track) return;

      const submittedValues: UploadedTrackUpdateValues = { ...formValues };
      // Remove rating field entirely if it's the "no rating" sentinel or out of the valid range (0-5)
      if (
        submittedValues.rating === undefined ||
        (submittedValues.rating as number) === FORM_RATING_NULL_VALUE ||
        submittedValues.rating < 0 ||
        submittedValues.rating > 5
      ) {
        delete submittedValues.rating;
      }

      updateTrack({ uuid: track.uuid, data: submittedValues });
    },
    [track, formValues, updateTrack],
  );

  const TrackEditionComponent = useMemo(() => {
    if (!show || !track) return null;

    return (
      <UploadedTrackEditionPopup
        onClose={() => setShow(false)}
        uploadedTrack={track}
        formValues={formValues}
        onFormChange={handleChange}
        onSubmit={handleSubmit}
      />
    );
  }, [show, track, formValues, handleChange, handleSubmit]);

  return {
    showEditPopup,
    TrackEditionComponent,
  };
}
