/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fff9eb',
                    100: '#ffefc7',
                    200: '#ffdb8b',
                    300: '#ffbf4a',
                    400: '#ffa11a',
                    500: '#f28b07',
                    600: '#e86c05', // Cor principal (RAIZ Orange)
                    700: '#bc4b06',
                    800: '#9b3b0d',
                    900: '#7f3210',
                },
                secondary: {
                    50: '#f1faf9',
                    100: '#daefee',
                    200: '#b8dfde',
                    300: '#8cc6c0', // Cor principal (Verde Água)
                    400: '#7abfb6',
                    500: '#4a9f97',
                    600: '#3a817a',
                    700: '#326964',
                    800: '#2d5551',
                    900: '#294845',
                }
            },
        },
    },
    plugins: [],
};
