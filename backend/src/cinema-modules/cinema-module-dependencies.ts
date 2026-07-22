import {
  CINEMA_MODULE_CATALOG,
  type CinemaModuleKey,
} from './cinema-module-catalog';

export const CINEMA_MODULE_DEPENDENCIES: Partial<
  Record<CinemaModuleKey, readonly CinemaModuleKey[]>
> = {
  SHIFT_PLANNING: ['SCHEDULE'],
  PAYROLL: ['TIME_TRACKING'],
};

const moduleNameByKey = new Map(
  CINEMA_MODULE_CATALOG.map((module) => [
    module.key,
    module.name,
  ]),
);

export function getCinemaModuleDependencies(
  moduleKey: CinemaModuleKey,
): readonly CinemaModuleKey[] {
  return (
    CINEMA_MODULE_DEPENDENCIES[moduleKey] ??
    []
  );
}

export function getCinemaModuleName(
  moduleKey: CinemaModuleKey,
) {
  return (
    moduleNameByKey.get(moduleKey) ??
    moduleKey
  );
}

export function getCinemaModuleDependencyMessage(
  moduleKey: CinemaModuleKey,
  dependencyKey: CinemaModuleKey,
) {
  return `${getCinemaModuleName(
    moduleKey,
  )} kræver, at ${getCinemaModuleName(
    dependencyKey,
  )} er aktiv.`;
}
