'use client';

import React from 'react';
import styled from 'styled-components';
import { useDcaBoardTheme } from '@/wrappers';

const StyledWrapper = styled.div`
  .theme-switch {
    --toggle-size: 16px;
    --container-width: 5.625em;
    --container-height: 2.5em;
    --container-radius: 0;
    --container-light-bg: #3d7eae;
    --container-night-bg: #1d1f2c;
    --circle-container-diameter: 3.375em;
    --sun-moon-diameter: 2.125em;
    --sun-bg: #ecca2f;
    --moon-bg: #c4c9d1;
    --spot-color: #959db1;
    --circle-container-offset: calc(
      (var(--circle-container-diameter) - var(--container-height)) / 2 * -1
    );
    --stars-color: #fff;
    --clouds-color: #f3fdff;
    --back-clouds-color: #aacadf;
    --transition: 0.5s cubic-bezier(0, -0.02, 0.4, 1.25);
    --circle-transition: 0.3s cubic-bezier(0, -0.02, 0.35, 1.17);
  }

  .theme-switch,
  .theme-switch *,
  .theme-switch *::before,
  .theme-switch *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-size: var(--toggle-size);
  }

  .theme-switch__container {
    width: var(--container-width);
    height: var(--container-height);
    background-color: var(--container-light-bg);
    border-radius: var(--container-radius);
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 -0.0625em 0.0625em rgba(0, 0, 0, 0.25),
      0 0.0625em 0.125em rgba(255, 255, 255, 0.94);
    transition: var(--transition);
    position: relative;
  }

  .theme-switch__container::before {
    content: '';
    position: absolute;
    z-index: 1;
    inset: 0;
    box-shadow: 0 0.05em 0.187em rgba(0, 0, 0, 0.25) inset,
      0 0.05em 0.187em rgba(0, 0, 0, 0.25) inset;
    border-radius: var(--container-radius);
  }

  .theme-switch__checkbox {
    display: none;
  }

  .theme-switch__circle-container {
    width: var(--circle-container-diameter);
    height: var(--circle-container-diameter);
    background-color: rgba(255, 255, 255, 0.1);
    position: absolute;
    left: var(--circle-container-offset);
    top: var(--circle-container-offset);
    border-radius: var(--container-radius);
    box-shadow: inset 0 0 0 3.375em rgba(255, 255, 255, 0.1),
      inset 0 0 0 3.375em rgba(255, 255, 255, 0.1),
      0 0 0 0.625em rgba(255, 255, 255, 0.1),
      0 0 0 1.25em rgba(255, 255, 255, 0.1);
    display: flex;
    transition: var(--circle-transition);
    pointer-events: none;
  }

  .theme-switch__sun-moon-container {
    pointer-events: auto;
    position: relative;
    z-index: 2;
    width: var(--sun-moon-diameter);
    height: var(--sun-moon-diameter);
    margin: auto;
    border-radius: var(--container-radius);
    background-color: var(--sun-bg);
    box-shadow: 0.0625em 0.0625em 0.0625em 0 rgba(254, 255, 239, 0.61) inset,
      0 -0.0625em 0.0625em 0 #a1872a inset;
    filter: drop-shadow(0.0625em 0.125em 0.125em rgba(0, 0, 0, 0.25))
      drop-shadow(0 0.0625em 0.125em rgba(0, 0, 0, 0.25));
    overflow: hidden;
    transition: var(--transition);
  }

  .theme-switch__moon {
    transform: translateX(100%);
    width: 100%;
    height: 100%;
    background-color: var(--moon-bg);
    border-radius: inherit;
    box-shadow: 0.0625em 0.0625em 0.0625em 0 rgba(254, 255, 239, 0.61) inset,
      0 -0.0625em 0.0625em 0 #969696 inset;
    position: relative;
    transition: var(--transition);
  }

  .theme-switch__spot {
    position: absolute;
    top: 0.75em;
    left: 0.3125em;
    width: 0.75em;
    height: 0.75em;
    border-radius: var(--container-radius);
    background-color: var(--spot-color);
    box-shadow: 0 0.0313em 0.0625em rgba(0, 0, 0, 0.25) inset;
  }

  .theme-switch__spot:nth-of-type(2) {
    width: 0.375em;
    height: 0.375em;
    top: 0.9375em;
    left: 1.375em;
  }

  .theme-switch__spot:nth-last-of-type(3) {
    width: 0.25em;
    height: 0.25em;
    top: 0.3125em;
    left: 0.8125em;
  }

  .theme-switch__clouds {
    width: 1.25em;
    height: 1.25em;
    background-color: var(--clouds-color);
    border-radius: var(--container-radius);
    position: absolute;
    bottom: -0.625em;
    left: 0.3125em;
    box-shadow: 0.9375em 0.3125em var(--clouds-color),
      -0.3125em -0.3125em var(--back-clouds-color),
      1.4375em 0.375em var(--clouds-color),
      0.5em -0.125em var(--back-clouds-color),
      2.1875em 0 var(--clouds-color),
      1.25em -0.0625em var(--back-clouds-color),
      2.9375em 0.3125em var(--clouds-color),
      2em -0.3125em var(--back-clouds-color),
      3.625em -0.0625em var(--clouds-color),
      2.625em 0 var(--back-clouds-color),
      4.5em -0.3125em var(--clouds-color),
      3.375em -0.4375em var(--back-clouds-color);
    transition: 0.5s cubic-bezier(0, -0.02, 0.4, 1.25);
  }

  .theme-switch__stars-container {
    position: absolute;
    color: var(--stars-color);
    top: -100%;
    left: 0.3125em;
    width: 2.75em;
    height: auto;
    transition: var(--transition);
  }

  .theme-switch__checkbox:checked + .theme-switch__container {
    background-color: var(--container-night-bg);
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter));
  }

  .theme-switch__circle-container:hover {
    left: calc(var(--circle-container-offset) + 0.1875em);
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__moon {
    transform: translate(0);
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__clouds {
    bottom: -4.0625em;
  }

  .theme-switch__checkbox:checked
    + .theme-switch__container
    .theme-switch__stars-container {
    top: 50%;
    transform: translateY(-50%);
  }
`;

const Switch: React.FC = () => {
  const { isDark, toggle } = useDcaBoardTheme();

  return (
    <StyledWrapper className='h-10 flex items-center'>
      <label className='theme-switch'>
        <input
          type='checkbox'
          className='theme-switch__checkbox'
          checked={isDark}
          onChange={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        />
        <div className='theme-switch__container'>
          <div className='theme-switch__clouds' />
          <div className='theme-switch__stars-container'>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 144 55' fill='none'>
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.946 140.167 35.472 140.5 36.6465C139.727 36.1253 138.886 35.854 138 35.854C137.114 35.854 136.273 36.1253 135.5 36.6465C135.5 35.4823 135.671 34.4732 136 33.638C136.083 33.425 136.182 33.2229 136.293 33.0321C136.135 33.0699 135.973 33.0891 135.807 33.0891C135.596 33.0891 135.39 33.0679 135.19 33.0273C134.985 32.9852 134.79 32.9198 134.606 32.8317C134.421 32.7437 134.25 32.6326 134.094 32.5C133.947 32.376 133.817 32.2305 133.704 32.064C133.6 31.899 133.513 31.716 133.445 31.518C133.377 31.319 133.333 31.107 133.313 30.886C133.293 30.664 133.298 30.438 133.327 30.208C133.327 30.208 133.333 30.1803 133.333 30.1467C133.733 29.9895 133.978 29.8048 134.066 29.592L134.998 29.673L135.929 29.7542C135.953 29.6977 135.977 29.6402 136 29.5821C136 29.7215 136 29.8616 136 30.0023C135 29.8824 134 29.8628 133 29.9424C132.101 30.0073 131.254 30.2684 130.5 30.6825C129.746 31.0949 129.133 31.6949 128.734 32.4464C128.335 33.197 128.111 34.0754 128.111 35.0645C128.111 34.553 128.199 34.0661 128.362 33.4833C128.526 32.9008 128.766 32.3605 129 31.9395C128.742 32.6578 128.615 33.5505 128.615 34.8566C128.615 35.6821 128.703 36.1913 128.902 37.4129C129.101 38.6349 129.489 40.0251 130.066 41.2081C130.009 41.1511 129.983 41.0722 129.983 40.9846C129.983 40.6435 130.165 40.4186 130.361 40.0918C130.548 39.7654 130.697 39.4372 130.797 39.0993C130.926 38.6414 130.998 38.0938 130.998 37.5V37.4981C130.997 37.6424 130.975 37.7814 130.938 37.9166C130.898 38.0518 130.845 38.1818 130.78 38.2829C130.702 38.0809 130.629 37.8716 130.563 37.6579C130.497 37.4443 130.454 37.2312 130.435 37.0102C130.417 36.7921 130.422 36.5666 130.451 36.3365C130.451 36.3346 130.457 36.3099 130.47 36.2649C130.876 36.4213 131.314 36.5 131.764 36.5C132.214 36.5 132.653 36.4213 133.058 36.2639Z'
              />
            </svg>
          </div>
          <div className='theme-switch__circle-container'>
            <div className='theme-switch__sun-moon-container'>
              <div className='theme-switch__moon'>
                <div className='theme-switch__spot' />
                <div className='theme-switch__spot' />
                <div className='theme-switch__spot' />
              </div>
            </div>
          </div>
        </div>
      </label>
    </StyledWrapper>
  );
};

export default Switch;


