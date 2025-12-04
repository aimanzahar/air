/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as airHistory from "../airHistory.js";
import type * as auth from "../auth.js";
import type * as healthProfile from "../healthProfile.js";
import type * as passport from "../passport.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  airHistory: typeof airHistory;
  auth: typeof auth;
  healthProfile: typeof healthProfile;
  passport: typeof passport;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  air: {
    airQualityHistory: {
      compareLocations: FunctionReference<
        "query",
        "internal",
        { days?: number; userKey: string },
        any
      >;
      getDailyAverages: FunctionReference<
        "query",
        "internal",
        { days?: number; userKey: string },
        any
      >;
      getHourlyAverages: FunctionReference<
        "query",
        "internal",
        { hours?: number; userKey: string },
        any
      >;
      getLastReadingTimestamp: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any
      >;
      getLocationHistory: FunctionReference<
        "query",
        "internal",
        { days?: number; locationName: string; userKey: string },
        any
      >;
      getRecentReadings: FunctionReference<
        "query",
        "internal",
        { minutes?: number; userKey: string },
        any
      >;
      getStatsSummary: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any
      >;
      getUserHistory: FunctionReference<
        "query",
        "internal",
        { days?: number; userKey: string },
        any
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
        any
      >;
    };
    auth: {
      login: FunctionReference<
        "mutation",
        "internal",
        { email: string; password: string },
        any
      >;
      logout: FunctionReference<"mutation", "internal", { token: string }, any>;
      session: FunctionReference<"query", "internal", { token?: string }, any>;
      signup: FunctionReference<
        "mutation",
        "internal",
        { email: string; name: string; password: string },
        any
      >;
    };
    healthProfile: {
      deleteHealthProfile: FunctionReference<
        "mutation",
        "internal",
        { userKey: string },
        any
      >;
      getHealthProfile: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any
      >;
      isHealthProfileComplete: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any
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
        any
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
        any
      >;
    };
    passport: {
      ensureProfile: FunctionReference<
        "mutation",
        "internal",
        { homeCity?: string; nickname?: string; userKey: string },
        any
      >;
      getPassport: FunctionReference<
        "query",
        "internal",
        { limit?: number; userKey: string },
        any
      >;
      insights: FunctionReference<
        "query",
        "internal",
        { userKey: string },
        any
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
        any
      >;
    };
  };
};
