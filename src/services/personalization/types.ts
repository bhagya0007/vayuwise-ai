import type {
  FamilyProfile,
  Locale,
  SustainableAlternative,
} from "@/types/domain";

export interface PersonalizationService {
  getDefaultProfile(locale?: Locale): FamilyProfile;
  shouldPrioritizeHealthOverOutdoorEco(usAqi: number, profile: FamilyProfile): boolean;
  filterAlternativesByProfile(
    alternatives: SustainableAlternative[],
    profile: FamilyProfile,
    usAqi: number
  ): SustainableAlternative[];
}
