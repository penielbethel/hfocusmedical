const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');

async function updateInvestigations() {
  try {
    await client.connect();
    const db = client.db('hfocus');
    
    const bookings = await db.collection('corporatebookings').find({}).toArray();
    console.log('Found', bookings.length, 'bookings to update');
    
    for (let booking of bookings) {
      let updated = false;
      
      for (let staff of booking.staff_members) {
        for (let inv of staff.investigations) {
          if (!inv.test_name && inv.price) {
            // Map price to test name based on common medical test prices
            if (inv.price === 3000) {
              inv.test_name = 'Blood Test';
            } else if (inv.price === 2000) {
              inv.test_name = 'X-Ray';
            } else if (inv.price === 5000) {
              inv.test_name = 'Ultrasound';
            } else if (inv.price === 10000) {
              inv.test_name = 'CT Scan';
            } else if (inv.price === 10500) {
              inv.test_name = 'MRI Scan';
            } else {
              inv.test_name = 'Medical Test';
            }
            
            inv.category = 'General';
            updated = true;
          }
        }
      }
      
      if (updated) {
        await db.collection('corporatebookings').updateOne(
          { _id: booking._id },
          { $set: { staff_members: booking.staff_members } }
        );
        console.log('Updated booking:', booking.organization_id);
      }
    }
    
    console.log('Database update completed');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

updateInvestigations();