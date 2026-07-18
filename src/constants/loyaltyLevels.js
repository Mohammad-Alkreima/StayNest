const LOYALTY_LEVELS = [
  {
    level: "Platinum",
    minCompletedBookings: 20,
    discountPercentage: 15,
  },
  {
    level: "Gold",
    minCompletedBookings: 10,
    discountPercentage: 10,
  },
  {
    level: "Silver",
    minCompletedBookings: 5,
    discountPercentage: 5,
  },
  {
    level: "Regular",
    minCompletedBookings: 0,
    discountPercentage: 0,
  },
];

module.exports = LOYALTY_LEVELS;