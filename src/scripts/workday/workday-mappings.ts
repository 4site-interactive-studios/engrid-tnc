import { WorkdayMapping } from "./workday.types";

export const workdayMappings: WorkdayMapping[] = [
  {
    old: {
      revenueCategory: "null",
      applicationOther: "Merchandise (460000)",
    },
    new: {
      revenueCategory: "UR:Merchandise Revenue (460000)",
      applicationOther: "Non-gift",
    },
  },
  {
    old: {
      revenueCategory: "null",
      applicationOther: "Lodging (460500)",
    },
    new: {
      revenueCategory: "UR:Hotel And Lodging (460000)",
      applicationOther: "Non-gift",
    },
  },
  {
    old: {
      revenueCategory: "null",
      applicationOther: "Miscellaneous Fee Revenue (460700)",
    },
    new: {
      revenueCategory: "UR:Miscellaneous Fee Revenue (460000)",
      applicationOther: "Non-gift",
    },
  },
  {
    old: {
      revenueCategory: "null",
      applicationOther: "Use Permits & Non-Real Estate Leases (461000)",
    },
    new: {
      revenueCategory:
        "UR:Use Permits and Non-Real Estate Leases Over Time (460000)",
      applicationOther: "Non-gift",
    },
  },
  {
    old: {
      revenueCategory: "null",
      applicationOther: "Trip Fees (462100)",
    },
    new: {
      revenueCategory: "UR:Fee-Field Trip (460000)",
      applicationOther: "Non-gift",
    },
  },
  {
    old: {
      revenueCategory: "null",
      applicationOther: "Special Event Revenue (462400)",
    },
    new: {
      revenueCategory: "UR:Special Event Revenue (460000)",
      applicationOther: "Non-gift",
    },
  },
  {
    old: {
      revenueCategory: "Unrestricted",
      applicationOther: "",
    },
    new: {
      revenueCategory: "UR:Donor Support (400000)",
      applicationOther: "",
    },
  },
  {
    old: {
      revenueCategory: "Temporarily Restricted",
      applicationOther: "",
    },
    new: {
      revenueCategory: "TR:Donor Support (400000)",
      applicationOther: "",
    },
  },
];
