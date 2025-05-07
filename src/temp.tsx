import React from 'react';
import { View, Text } from 'react-native';

const TempPage: React.FC = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>Temporary Page</Text>
            <Text style={{ fontSize: 18 }}>This is a temporary page for testing.</Text>
            <Text style={{ fontSize: 18 }}>You can add any content here.</Text>
        </View>
    );
};

export default TempPage;