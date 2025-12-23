const validateOutingTime = (date, time) => {
  const outingDate = new Date(date);
  const dayOfWeek = outingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const [hours, minutes] = time.split(':').map(Number);
  const outingTime = hours * 60 + minutes; // Convert to minutes

  // Sunday: 10 AM - 7 PM (600 - 1140 minutes)
  if (dayOfWeek === 0) {
    if (outingTime < 600 || outingTime > 1140) {
      return { valid: false, message: 'Sunday outing time must be between 10 AM and 7 PM' };
    }
  }
  // Saturday: 1 PM - 7 PM (780 - 1140 minutes)
  else if (dayOfWeek === 6) {
    if (outingTime < 780 || outingTime > 1140) {
      return { valid: false, message: 'Saturday outing time must be between 1 PM and 7 PM' };
    }
  }
  // Monday to Friday: 5 PM - 7 PM (1020 - 1140 minutes)
  else {
    if (outingTime < 1020 || outingTime > 1140) {
      return { valid: false, message: 'Weekday outing time must be between 5 PM and 7 PM' };
    }
  }

  return { valid: true };
};

module.exports = validateOutingTime;

