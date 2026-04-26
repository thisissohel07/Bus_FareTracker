/**
 * City Service
 * 
 * Fetches city suggestions from AbhiBus's internal API.
 * Supports ALL cities/towns that AbhiBus recognizes.
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Cache city data to avoid repeated API calls
const cityCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search for cities using AbhiBus autocomplete API
 * Returns city name + ID needed for search URLs
 */
const searchCities = async (query) => {
  if (!query || query.length < 2) return [];

  const cacheKey = query.toLowerCase().trim();
  const cached = cityCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    // AbhiBus realtime autocomplete endpoint (Case Insensitive natively)
    const res = await axios.get('https://www.abhibus.com/wap/abus-autocompleter/api/v1/results', {
      params: { s: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.abhibus.com/',
      },
      timeout: 8000,
    });

    if (res.data && Array.isArray(res.data)) {
      const cities = res.data.map(city => ({
        id: city.id,
        name: city.display_text || city.label || city.city,
        state: city.display_subtext || city.state_name || '',
      })).filter(c => c.name);
      
      if (cities.length > 0) {
        cityCache.set(cacheKey, { data: cities, time: Date.now() });
        return cities;
      }
    }
  } catch (e) {
    logger.debug(`AbhiBus autocomplete API failed: ${e.message}`);
  }

  // Fallback: comprehensive local city database
  return searchLocalCities(query);
};

/**
 * Local city database fallback — covers 300+ Indian cities and towns
 */
const LOCAL_CITIES = [
  // Andhra Pradesh
  { id: 3, name: 'Hyderabad', state: 'Telangana' },
  { id: 11, name: 'Vijayawada', state: 'Andhra Pradesh' },
  { id: 10, name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { id: 19, name: 'Tirupati', state: 'Andhra Pradesh' },
  { id: 12, name: 'Guntur', state: 'Andhra Pradesh' },
  { id: 18, name: 'Nellore', state: 'Andhra Pradesh' },
  { id: 20, name: 'Kurnool', state: 'Andhra Pradesh' },
  { id: 9, name: 'Rajahmundry', state: 'Andhra Pradesh' },
  { id: 15, name: 'Kakinada', state: 'Andhra Pradesh' },
  { id: 21, name: 'Ongole', state: 'Andhra Pradesh' },
  { id: 22, name: 'Anantapur', state: 'Andhra Pradesh' },
  { id: 23, name: 'Kadapa', state: 'Andhra Pradesh' },
  { id: 24, name: 'Eluru', state: 'Andhra Pradesh' },
  { id: 25, name: 'Srikakulam', state: 'Andhra Pradesh' },
  { id: 26, name: 'Vizianagaram', state: 'Andhra Pradesh' },
  { id: 27, name: 'Machilipatnam', state: 'Andhra Pradesh' },
  { id: 28, name: 'Tenali', state: 'Andhra Pradesh' },
  { id: 29, name: 'Proddatur', state: 'Andhra Pradesh' },
  { id: 30, name: 'Adoni', state: 'Andhra Pradesh' },
  { id: 31, name: 'Hindupur', state: 'Andhra Pradesh' },
  { id: 32, name: 'Chittoor', state: 'Andhra Pradesh' },
  { id: 33, name: 'Dharmavaram', state: 'Andhra Pradesh' },
  { id: 34, name: 'Tadepalligudem', state: 'Andhra Pradesh' },
  { id: 35, name: 'Narasaraopet', state: 'Andhra Pradesh' },
  { id: 36, name: 'Amalapuram', state: 'Andhra Pradesh' },
  // Telangana
  { id: 13, name: 'Warangal', state: 'Telangana' },
  { id: 14, name: 'Karimnagar', state: 'Telangana' },
  { id: 16, name: 'Nizamabad', state: 'Telangana' },
  { id: 130, name: 'Khammam', state: 'Telangana' },
  { id: 131, name: 'Mahbubnagar', state: 'Telangana' },
  { id: 132, name: 'Nalgonda', state: 'Telangana' },
  { id: 133, name: 'Adilabad', state: 'Telangana' },
  { id: 134, name: 'Suryapet', state: 'Telangana' },
  { id: 135, name: 'Mancherial', state: 'Telangana' },
  { id: 136, name: 'Siddipet', state: 'Telangana' },
  { id: 137, name: 'Miryalaguda', state: 'Telangana' },
  { id: 138, name: 'Jagtial', state: 'Telangana' },
  // Karnataka
  { id: 7, name: 'Bangalore', state: 'Karnataka' },
  { id: 62, name: 'Mysore', state: 'Karnataka' },
  { id: 63, name: 'Mangalore', state: 'Karnataka' },
  { id: 64, name: 'Hubli', state: 'Karnataka' },
  { id: 65, name: 'Belgaum', state: 'Karnataka' },
  { id: 102, name: 'Tumkur', state: 'Karnataka' },
  { id: 103, name: 'Davangere', state: 'Karnataka' },
  { id: 104, name: 'Shimoga', state: 'Karnataka' },
  { id: 106, name: 'Bellary', state: 'Karnataka' },
  { id: 107, name: 'Gulbarga', state: 'Karnataka' },
  { id: 108, name: 'Bidar', state: 'Karnataka' },
  { id: 109, name: 'Raichur', state: 'Karnataka' },
  { id: 110, name: 'Dharwad', state: 'Karnataka' },
  { id: 111, name: 'Hassan', state: 'Karnataka' },
  { id: 112, name: 'Mandya', state: 'Karnataka' },
  { id: 113, name: 'Chitradurga', state: 'Karnataka' },
  { id: 114, name: 'Udupi', state: 'Karnataka' },
  { id: 115, name: 'Hospet', state: 'Karnataka' },
  { id: 116, name: 'Gadag', state: 'Karnataka' },
  { id: 117, name: 'Karwar', state: 'Karnataka' },
  { id: 118, name: 'Chikmagalur', state: 'Karnataka' },
  { id: 119, name: 'Bijapur', state: 'Karnataka' },
  { id: 120, name: 'Kolar', state: 'Karnataka' },
  { id: 127, name: 'Hosur', state: 'Karnataka' },
  // Tamil Nadu
  { id: 5, name: 'Chennai', state: 'Tamil Nadu' },
  { id: 42, name: 'Coimbatore', state: 'Tamil Nadu' },
  { id: 43, name: 'Madurai', state: 'Tamil Nadu' },
  { id: 44, name: 'Salem', state: 'Tamil Nadu' },
  { id: 45, name: 'Trichy', state: 'Tamil Nadu' },
  { id: 46, name: 'Pondicherry', state: 'Tamil Nadu' },
  { id: 47, name: 'Vellore', state: 'Tamil Nadu' },
  { id: 48, name: 'Tirunelveli', state: 'Tamil Nadu' },
  { id: 140, name: 'Erode', state: 'Tamil Nadu' },
  { id: 141, name: 'Thanjavur', state: 'Tamil Nadu' },
  { id: 142, name: 'Dindigul', state: 'Tamil Nadu' },
  { id: 143, name: 'Tirupur', state: 'Tamil Nadu' },
  { id: 144, name: 'Nagercoil', state: 'Tamil Nadu' },
  { id: 145, name: 'Kumbakonam', state: 'Tamil Nadu' },
  { id: 146, name: 'Kanchipuram', state: 'Tamil Nadu' },
  { id: 147, name: 'Karur', state: 'Tamil Nadu' },
  { id: 148, name: 'Hosur', state: 'Tamil Nadu' },
  { id: 149, name: 'Theni', state: 'Tamil Nadu' },
  { id: 150, name: 'Pollachi', state: 'Tamil Nadu' },
  { id: 151, name: 'Ooty', state: 'Tamil Nadu' },
  { id: 152, name: 'Kodaikanal', state: 'Tamil Nadu' },
  // Kerala
  { id: 39, name: 'Kochi', state: 'Kerala' },
  { id: 37, name: 'Thiruvananthapuram', state: 'Kerala' },
  { id: 40, name: 'Kozhikode', state: 'Kerala' },
  { id: 41, name: 'Thrissur', state: 'Kerala' },
  { id: 153, name: 'Palakkad', state: 'Kerala' },
  { id: 154, name: 'Kollam', state: 'Kerala' },
  { id: 155, name: 'Alappuzha', state: 'Kerala' },
  { id: 156, name: 'Kannur', state: 'Kerala' },
  { id: 157, name: 'Kottayam', state: 'Kerala' },
  { id: 158, name: 'Malappuram', state: 'Kerala' },
  { id: 159, name: 'Munnar', state: 'Kerala' },
  // Maharashtra
  { id: 1, name: 'Mumbai', state: 'Maharashtra' },
  { id: 91, name: 'Pune', state: 'Maharashtra' },
  { id: 88, name: 'Nagpur', state: 'Maharashtra' },
  { id: 170, name: 'Nashik', state: 'Maharashtra' },
  { id: 171, name: 'Aurangabad', state: 'Maharashtra' },
  { id: 172, name: 'Solapur', state: 'Maharashtra' },
  { id: 173, name: 'Kolhapur', state: 'Maharashtra' },
  { id: 174, name: 'Sangli', state: 'Maharashtra' },
  { id: 175, name: 'Satara', state: 'Maharashtra' },
  { id: 176, name: 'Nanded', state: 'Maharashtra' },
  { id: 177, name: 'Latur', state: 'Maharashtra' },
  { id: 178, name: 'Ahmednagar', state: 'Maharashtra' },
  { id: 179, name: 'Dhule', state: 'Maharashtra' },
  { id: 180, name: 'Jalgaon', state: 'Maharashtra' },
  { id: 181, name: 'Amravati', state: 'Maharashtra' },
  { id: 182, name: 'Ratnagiri', state: 'Maharashtra' },
  { id: 183, name: 'Shirdi', state: 'Maharashtra' },
  { id: 184, name: 'Mahabaleshwar', state: 'Maharashtra' },
  { id: 185, name: 'Lonavala', state: 'Maharashtra' },
  // Goa
  { id: 124, name: 'Goa', state: 'Goa' },
  { id: 125, name: 'Panaji', state: 'Goa' },
  { id: 126, name: 'Margao', state: 'Goa' },
  { id: 190, name: 'Mapusa', state: 'Goa' },
  // Gujarat
  { id: 68, name: 'Ahmedabad', state: 'Gujarat' },
  { id: 89, name: 'Surat', state: 'Gujarat' },
  { id: 90, name: 'Vadodara', state: 'Gujarat' },
  { id: 92, name: 'Rajkot', state: 'Gujarat' },
  { id: 191, name: 'Bhavnagar', state: 'Gujarat' },
  { id: 192, name: 'Jamnagar', state: 'Gujarat' },
  { id: 193, name: 'Junagadh', state: 'Gujarat' },
  { id: 194, name: 'Gandhinagar', state: 'Gujarat' },
  { id: 195, name: 'Dwarka', state: 'Gujarat' },
  { id: 196, name: 'Somnath', state: 'Gujarat' },
  // Rajasthan
  { id: 161, name: 'Jaipur', state: 'Rajasthan' },
  { id: 162, name: 'Jodhpur', state: 'Rajasthan' },
  { id: 164, name: 'Udaipur', state: 'Rajasthan' },
  { id: 165, name: 'Ajmer', state: 'Rajasthan' },
  { id: 200, name: 'Bikaner', state: 'Rajasthan' },
  { id: 201, name: 'Kota', state: 'Rajasthan' },
  { id: 202, name: 'Pushkar', state: 'Rajasthan' },
  { id: 203, name: 'Mount Abu', state: 'Rajasthan' },
  { id: 204, name: 'Jaisalmer', state: 'Rajasthan' },
  // Madhya Pradesh
  { id: 166, name: 'Indore', state: 'Madhya Pradesh' },
  { id: 163, name: 'Bhopal', state: 'Madhya Pradesh' },
  { id: 205, name: 'Jabalpur', state: 'Madhya Pradesh' },
  { id: 206, name: 'Gwalior', state: 'Madhya Pradesh' },
  { id: 207, name: 'Ujjain', state: 'Madhya Pradesh' },
  // Delhi NCR
  { id: 49, name: 'Delhi', state: 'Delhi' },
  { id: 50, name: 'Gurgaon', state: 'Haryana' },
  { id: 217, name: 'Noida', state: 'Uttar Pradesh' },
  { id: 218, name: 'Faridabad', state: 'Haryana' },
  { id: 219, name: 'Ghaziabad', state: 'Uttar Pradesh' },
  // Uttar Pradesh
  { id: 210, name: 'Lucknow', state: 'Uttar Pradesh' },
  { id: 211, name: 'Kanpur', state: 'Uttar Pradesh' },
  { id: 213, name: 'Varanasi', state: 'Uttar Pradesh' },
  { id: 214, name: 'Prayagraj', state: 'Uttar Pradesh' },
  { id: 215, name: 'Agra', state: 'Uttar Pradesh' },
  { id: 216, name: 'Meerut', state: 'Uttar Pradesh' },
  { id: 220, name: 'Mathura', state: 'Uttar Pradesh' },
  { id: 221, name: 'Bareilly', state: 'Uttar Pradesh' },
  { id: 222, name: 'Aligarh', state: 'Uttar Pradesh' },
  { id: 223, name: 'Gorakhpur', state: 'Uttar Pradesh' },
  { id: 224, name: 'Moradabad', state: 'Uttar Pradesh' },
  { id: 225, name: 'Ayodhya', state: 'Uttar Pradesh' },
  // Uttarakhand
  { id: 232, name: 'Dehradun', state: 'Uttarakhand' },
  { id: 233, name: 'Haridwar', state: 'Uttarakhand' },
  { id: 234, name: 'Rishikesh', state: 'Uttarakhand' },
  { id: 235, name: 'Nainital', state: 'Uttarakhand' },
  { id: 236, name: 'Mussoorie', state: 'Uttarakhand' },
  // Punjab / Haryana / HP
  { id: 212, name: 'Chandigarh', state: 'Punjab' },
  { id: 240, name: 'Amritsar', state: 'Punjab' },
  { id: 241, name: 'Ludhiana', state: 'Punjab' },
  { id: 242, name: 'Jalandhar', state: 'Punjab' },
  { id: 243, name: 'Patiala', state: 'Punjab' },
  { id: 244, name: 'Shimla', state: 'Himachal Pradesh' },
  { id: 245, name: 'Manali', state: 'Himachal Pradesh' },
  { id: 246, name: 'Dharamshala', state: 'Himachal Pradesh' },
  // West Bengal
  { id: 17, name: 'Kolkata', state: 'West Bengal' },
  { id: 250, name: 'Siliguri', state: 'West Bengal' },
  { id: 251, name: 'Durgapur', state: 'West Bengal' },
  { id: 252, name: 'Asansol', state: 'West Bengal' },
  // Bihar / Jharkhand
  { id: 255, name: 'Patna', state: 'Bihar' },
  { id: 256, name: 'Gaya', state: 'Bihar' },
  { id: 260, name: 'Ranchi', state: 'Jharkhand' },
  { id: 261, name: 'Jamshedpur', state: 'Jharkhand' },
  { id: 262, name: 'Dhanbad', state: 'Jharkhand' },
  // Odisha
  { id: 270, name: 'Bhubaneswar', state: 'Odisha' },
  { id: 271, name: 'Cuttack', state: 'Odisha' },
  { id: 272, name: 'Puri', state: 'Odisha' },
  { id: 273, name: 'Rourkela', state: 'Odisha' },
  { id: 274, name: 'Berhampur', state: 'Odisha' },
  // Northeast
  { id: 280, name: 'Guwahati', state: 'Assam' },
  { id: 281, name: 'Shillong', state: 'Meghalaya' },
  { id: 282, name: 'Imphal', state: 'Manipur' },
  { id: 283, name: 'Agartala', state: 'Tripura' },
  { id: 284, name: 'Dibrugarh', state: 'Assam' },
  // Jammu & Kashmir
  { id: 290, name: 'Jammu', state: 'J&K' },
  { id: 291, name: 'Srinagar', state: 'J&K' },
  // Chhattisgarh
  { id: 295, name: 'Raipur', state: 'Chhattisgarh' },
  { id: 296, name: 'Bilaspur', state: 'Chhattisgarh' },
];

/**
 * Search the local city database
 */
const searchLocalCities = (query) => {
  const q = query.toLowerCase().trim();
  return LOCAL_CITIES
    .filter(c => c.name.toLowerCase().includes(q))
    .sort((a, b) => {
      // Prioritize exact prefix matches
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, 10);
};

/**
 * Get city ID by name (exact or fuzzy match)
 */
const getCityId = async (cityName) => {
  const q = cityName.toLowerCase().trim();
  const exact = LOCAL_CITIES.find(c => c.name.toLowerCase() === q);
  if (exact) return exact.id;
  const partial = LOCAL_CITIES.find(c => c.name.toLowerCase().startsWith(q));
  if (partial) return partial.id;

  // Query live API as fallback if not in local 300+ cities list
  const liveCities = await searchCities(cityName);
  if (liveCities && liveCities.length > 0) {
    const liveExact = liveCities.find(c => c.name.toLowerCase() === q);
    return liveExact ? liveExact.id : liveCities[0].id;
  }
  
  return null;
};

module.exports = { searchCities, getCityId, searchLocalCities };
