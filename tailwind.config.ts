import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				
				/* Live dot color */
				'live-dot': 'hsl(var(--live-dot))',
				'live-glow': 'hsl(var(--live-glow))',
				
				/* Brand Colors - Minimal */
				'brand-primary': 'hsl(var(--brand-primary))',
				'brand-secondary': 'hsl(var(--brand-secondary))',
				'brand-accent': 'hsl(var(--brand-accent))',
				'brand-success': 'hsl(var(--brand-success))',
				'brand-warning': 'hsl(var(--brand-warning))',
				'brand-error': 'hsl(var(--brand-error))',
				
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					border: 'hsl(var(--card-border))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			boxShadow: {
				'minimal': '0 2px 10px hsl(0 0% 0% / 0.1)',
				'card': '0 4px 20px hsl(0 0% 0% / 0.15)',
				'elevated': '0 8px 40px hsl(0 0% 0% / 0.2)',
				'live': '0 0 20px hsl(var(--live-glow) / 0.4)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'live-glow': {
					'0%': { 
						boxShadow: '0 0 5px hsl(var(--live-glow) / 0.5)',
						opacity: '0.8'
					},
					'50%': { 
						boxShadow: '0 0 15px hsl(var(--live-glow) / 0.8)',
						opacity: '1'
					},
					'100%': { 
						boxShadow: '0 0 5px hsl(var(--live-glow) / 0.5)',
						opacity: '0.8'
					}
				},
				'live-pulse': {
					'0%': { 
						transform: 'scale(1)',
						boxShadow: '0 0 10px hsl(var(--live-glow) / 0.6)'
					},
					'50%': { 
						transform: 'scale(1.1)',
						boxShadow: '0 0 20px hsl(var(--live-glow) / 0.9)'
					},
					'100%': { 
						transform: 'scale(1)',
						boxShadow: '0 0 10px hsl(var(--live-glow) / 0.6)'
					}
				},
				fadeIn: {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0px)' }
				},
				shimmer: {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'live-glow': 'live-glow 2s ease-in-out infinite',
				'live-pulse': 'live-pulse 1s ease-in-out infinite',
				'fadeIn': 'fadeIn 0.5s ease-out',
				'shimmer': 'shimmer 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
