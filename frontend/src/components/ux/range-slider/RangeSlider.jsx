import React from 'react';

/**
 * RangeSlider Component
 * Renders a dual-handle range slider for filtering by numeric values
 *
 * @param {Object} props - Props for the component
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {number} props.minValue - Current minimum selected value
 * @param {number} props.maxValue - Current maximum selected value
 * @param {Function} props.onChange - Callback when range changes
 * @param {string} props.label - Label for the slider
 * @param {number} props.step - Step increment (default: 0.5 for ratings)
 */
const RangeSlider = ({ min, max, minValue, maxValue, onChange, label, step = 0.5 }) => {
  const handleMinChange = (e) => {
    const value = parseFloat(e.target.value);
    if (value <= maxValue) {
      onChange({ min: value, max: maxValue });
    }
  };

  const handleMaxChange = (e) => {
    const value = parseFloat(e.target.value);
    if (value >= minValue) {
      onChange({ min: minValue, max: value });
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{minValue}</span>
        <span className="text-sm font-medium text-gray-700">{maxValue}</span>
      </div>
      
      <div className="relative pt-1">
        <div className="relative">
          {/* Min slider */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={minValue}
            onChange={handleMinChange}
            className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-20"
            style={{
              WebkitAppearance: 'none',
            }}
          />
          
          {/* Max slider */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={maxValue}
            onChange={handleMaxChange}
            className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-20"
            style={{
              WebkitAppearance: 'none',
            }}
          />
          
          {/* Track */}
          <div className="relative h-2 bg-gray-200 rounded-full">
            <div
              className="absolute h-2 bg-indigo-500 rounded-full"
              style={{
                left: `${((minValue - min) / (max - min)) * 100}%`,
                right: `${100 - ((maxValue - min) / (max - min)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          pointer-events: all;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          pointer-events: all;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default RangeSlider;
