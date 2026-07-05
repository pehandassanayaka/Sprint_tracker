const { db, run } = require('./src/db/database');

const seedData = async () => {
    try {
        console.log('Starting database seeding...');
        
        // Give the DB a moment to initialize the tables
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create a 2-week sprint
        const sprintStartDate = '2026-07-01';
        const sprintEndDate = '2026-07-14';

        const sprintResult = await run('INSERT INTO Sprints (start_date, end_date) VALUES (?, ?)', [sprintStartDate, sprintEndDate]);
        const sprintId = sprintResult.lastID;
        console.log(`Created Sprint with ID: ${sprintId}`);

        // Sample tasks for the sprint
        const tasks = [
            { date: '2026-07-01', description: 'Setup project repository and configure tools', tags: 'setup,infra', time_spent: 4.5 },
            { date: '2026-07-02', description: 'Design SQLite schema and define API endpoints', tags: 'design,backend', time_spent: 3.0 },
            { date: '2026-07-03', description: 'Implement Sprint CRUD endpoints', tags: 'backend,api', time_spent: 5.0 },
            { date: '2026-07-04', description: 'Implement Task CRUD endpoints', tags: 'backend,api', time_spent: 4.0 },
            { date: '2026-07-05', description: 'Write seed script and populate sample data', tags: 'backend,script', time_spent: 2.0 },
            { date: '2026-07-06', description: 'Setup React SPA frontend structure', tags: 'frontend,setup', time_spent: 3.5 },
            { date: '2026-07-07', description: 'Create Sprint list and details view', tags: 'frontend,ui', time_spent: 6.0 },
            { date: '2026-07-08', description: 'Create Task list component and fetch data', tags: 'frontend,ui', time_spent: 5.5 }
        ];

        for (const task of tasks) {
            await run(
                'INSERT INTO Tasks (sprint_id, date, description, tags, time_spent) VALUES (?, ?, ?, ?, ?)',
                [sprintId, task.date, task.description, task.tags, task.time_spent]
            );
        }

        console.log('Seeded tasks successfully.');
        
        // Close DB connection
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Closed the database connection.');
        });
        
    } catch (err) {
        console.error('Seeding failed:', err);
    }
};

seedData();
