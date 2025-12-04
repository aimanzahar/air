/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    airQualityHistory: {
      compareLocations: FunctionReference<
        "query",
        "internal",
        { days?: number; userKey: string },
        any,
        Name
      >;
      getDailyAverages: FunctionReference<
        "query",
        "internal",
        { days?: number; userKey: string },
        any,
        Name
      >;
      getHourlyAverages: FunctionReference<
        "query",
        "internal",
        { hours?: number; userKey: string },
        any,
        Name
      >;
      getLastReadingTimestamp: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any,
        Name
      >;
      getLocationHistory: FunctionReference<
        "query",
        "internal",
        { days?: number; locationName: string; userKey: string },
        any,
        Name
      >;
      getRecentReadings: FunctionReference<
        "query",
        "internal",
        { minutes?: number; userKey: string },
        any,
        Name
      >;
      getStatsSummary: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any,
        Name
      >;
      getUserHistory: FunctionReference<
        "query",
        "internal",
        { days?: number; userKey: string },
        any,
        Name
      >;
      storeReading: FunctionReference<
        "mutation",
        "internal",
        {
          aqi: number;
          co?: number;
          lat: number;
          lng: number;
          locationName: string;
          no2?: number;
          o3?: number;
          pm10?: number;
          pm25?: number;
          riskLevel: string;
          so2?: number;
          source: string;
          userKey: string;
        },
        any,
        Name
      >;
    };
    auth: {
      login: FunctionReference<
        "mutation",
        "internal",
        { email: string; password: string },
        any,
        Name
      >;
      logout: FunctionReference<
        "mutation",
        "internal",
        { token: string },
        any,
        Name
      >;
      session: FunctionReference<
        "query",
        "internal",
        { token?: string },
        any,
        Name
      >;
      signup: FunctionReference<
        "mutation",
        "internal",
        { email: string; name: string; password: string },
        any,
        Name
      >;
    };
    healthProfile: {
      deleteHealthProfile: FunctionReference<
        "mutation",
        "internal",
        { userKey: string },
        any,
        Name
      >;
      getHealthProfile: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any,
        Name
      >;
      isHealthProfileComplete: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any,
        Name
      >;
      saveHealthProfile: FunctionReference<
        "mutation",
        "internal",
        {
          activityLevel?: string;
          age?: string;
          conditionSeverity?: string;
          conditions: Array<string>;
          gender?: string;
          hasAirPurifier?: boolean;
          hasHeartCondition?: boolean;
          hasRespiratoryCondition: boolean;
          isPregnant?: boolean;
          livesNearTraffic?: boolean;
          medications: Array<string>;
          name?: string;
          outdoorExposure?: string;
          smokingStatus?: string;
          userKey: string;
        },
        any,
        Name
      >;
      updateHealthConditions: FunctionReference<
        "mutation",
        "internal",
        {
          conditionSeverity?: string;
          conditions: Array<string>;
          hasRespiratoryCondition: boolean;
          medications: Array<string>;
          userKey: string;
        },
        any,
        Name
      >;
    };
    passport: {
      ensureProfile: FunctionReference<
        "mutation",
        "internal",
        { homeCity?: string; nickname?: string; userKey: string },
        any,
        Name
      >;
      getPassport: FunctionReference<
        "query",
        "internal",
        { limit?: number; userKey: string },
        any,
        Name
      >;
      insights: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any,
        Name
      >;
      logExposure: FunctionReference<
        "mutation",
        "internal",
        {
          co?: number;
          lat: number;
          locationName: string;
          lon: number;
          mode?: string;
          no2?: number;
          pm25?: number;
          timestamp?: number;
          userKey: string;
        },
        any,
        Name
      >;
    };
  };
