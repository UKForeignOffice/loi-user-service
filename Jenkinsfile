node {
    stage 'Step 1: Test'
        build job: 'Service Testing/Unit testing/User Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/master']]
    }