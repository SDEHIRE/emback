const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');  // Import the CORS package

// Connect to MongoDB
mongoose.connect("mongodb+srv://sdehire:1111@cluster0.pft5g.mongodb.net/sdehire", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

const app = express();

// Enable CORS for all routes
app.use(cors());  // This will allow cross-origin requests from any origin
app.use(bodyParser.json());

// Define the Emotion schema
const emotionSchema = new mongoose.Schema({
    user_id: String,
    session_id: String,
    dominant_emotion: String,
    confidence: Number,
    all_emotions: {
        angry: Number,
        disgust: Number,
        fear: Number,
        happy: Number,
        sad: Number,
        surprise: Number,
        neutral: Number,
    }
}, { collection: 'emotion' });  // Explicitly set the collection name

const Emotion = mongoose.model('Emotion', emotionSchema);
app.post('/get-emotion-report', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        console.error('User ID is required');
        return res.status(400).json({ message: 'User ID is required' });
    }

    console.log(`Fetching emotion report for user: ${user_id}`);

    try {
        // Fetch all emotion instances for the given user_id
        const emotions = await Emotion.find({ user_id }).limit(300);

        if (emotions.length === 0) {
            console.error(`No emotion data found for user: ${user_id}`);
            return res.status(404).json({ message: 'No emotion data found for this user' });
        }

        let overallEmotion = {
            dominant_emotion: '',
            total_confidence: 0,
            emotion_scores: {
                angry: 0,
                disgust: 0,
                fear: 0,
                happy: 0,
                sad: 0,
                surprise: 0,
                neutral: 0,
            },
        };

        emotions.forEach(emotion => {
            overallEmotion.total_confidence += emotion.confidence;

            // Aggregate all emotions
            Object.keys(overallEmotion.emotion_scores).forEach(emotionKey => {
                overallEmotion.emotion_scores[emotionKey] += emotion.all_emotions[emotionKey];
            });
        });

        // Calculate the average confidence
        overallEmotion.total_confidence /= emotions.length;

        // Get total sum of all emotions
        const totalEmotionCount = Object.values(overallEmotion.emotion_scores).reduce((sum, val) => sum + val, 0);

        if (totalEmotionCount > 0) {
            // Convert to percentages
            Object.keys(overallEmotion.emotion_scores).forEach(emotionKey => {
                overallEmotion.emotion_scores[emotionKey] = ((overallEmotion.emotion_scores[emotionKey] / totalEmotionCount) * 100).toFixed(2);
            });

            // Determine dominant emotion based on percentage
            const dominantEmotionScore = Math.max(...Object.values(overallEmotion.emotion_scores));
            overallEmotion.dominant_emotion = Object.keys(overallEmotion.emotion_scores).find(
                key => parseFloat(overallEmotion.emotion_scores[key]) === dominantEmotionScore
            );
        }

        console.log(`Generated emotion report for user: ${user_id}`, overallEmotion);
        return res.json(overallEmotion);
    } catch (error) {
        console.error('Error fetching emotion data:', error.message);
        return res.status(500).json({ message: 'Error fetching data' });
    }
});


// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
