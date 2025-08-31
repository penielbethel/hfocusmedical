const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
    try {
        console.log('Starting PDF generation...');
        
        // Launch browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Read the HTML template
        const htmlPath = path.join(__dirname, 'pdf', 'health-plans-template.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Set content
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Generate PDF
        const pdfPath = path.join(__dirname, 'pdf', 'H-Focus-Health-Packages2026.pdf');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        await browser.close();
        
        console.log('PDF generated successfully at:', pdfPath);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        
        // Fallback: Create a simple text-based PDF placeholder
        const fallbackContent = `H-Focus Health Check Plans 2026

Platinum Plan - ₦ 440,500
- DIAGNOSTIC INVESTIGATION (9)
- Coronary Risk Markers (8) & Lipid Profile
- Renal Profile (10)
- Liver Profile (7)
- Diabetic Profile (4)
- Cancer Risk Markers (2)
- Thyroid Panel (1)
- Medical Examination (3)

Diamond Plan - ₦ 320,500
- DIAGNOSTIC INVESTIGATION (8)
- Coronary Risk Markers (8) & Lipid Profile
- Renal Profile (10)
- Liver Profile (7)
- Diabetic Profile (4)
- Cancer Risk Markers (2)
- Thyroid Panel (1)
- Medical Examination (3)

Gold Plan - ₦ 253,000
- DIAGNOSTIC INVESTIGATION (7)
- Coronary Risk Markers (6) & Lipid Profile
- Renal Profile (10)
- Liver Profile (7)
- Diabetic Profile (4)
- Cancer Risk Markers (2)
- Thyroid Panel (1)
- Medical Examination (3)

Silver Plan - ₦ 164,000
- DIAGNOSTIC INVESTIGATION (7)
- Coronary Risk Markers (8) & Lipid Profile
- Renal Profile (10)
- Liver Profile (7)
- Diabetic Profile (4)
- Cancer Risk Markers (0)
- Thyroid Panel (1)
- Medical Examination (3)

Executive Plan - ₦ 131,000
- DIAGNOSTIC INVESTIGATION (3)
- Coronary Risk Markers (7) & Lipid Profile
- Renal Profile (10)
- Liver Profile (7)
- Diabetic Profile (2)
- Cancer Risk Markers (0)
- Thyroid Panel (1)
- Medical Examination (3)

H-Focus Medical Services
Your Health, Our Priority
Contact us for more information about our comprehensive health check packages`;
        
        const fallbackPath = path.join(__dirname, 'pdf', 'H-Focus-Health-Packages2026.txt');
        fs.writeFileSync(fallbackPath, fallbackContent);
        console.log('Fallback text file created at:', fallbackPath);
    }
}

// Run the function
generatePDF();