import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

/**
 * Ancienne fiche Chronologie : redirige vers la Fiche d'arrêt unifiée
 * (Décisions liées + Lignée y figurent désormais).
 */
export default function ChronologieDecisionRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/chronologie" />;
  return <Redirect href={`/arrets/${id}`} />;
}
