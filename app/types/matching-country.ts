/** Строка списка направлений под картой: совпадает с фильтром раскраски. */
export interface MatchingCountryRow {
  iso2: string;
  visa_category: string;
  /** lowercase из geodata или null, если нет в данных */
  safety_level: string | null;
}
