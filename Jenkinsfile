node {
    stage 'Step 1: Test'
        build job: 'Service Testing/Unit testing/User Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/master']]
    stage 'Step 2: Create Production Image'
          build job:  'Service Deployment/Create Production Images', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'https://github.com/UKForeignOffice/loi-user-service.git/'], [$class: 'StringParameterValue', name: 'Branch', value: 'master'], [$class: 'StringParameterValue', name: 'Tag', value: 'user-service-prod'], [$class: 'StringParameterValue', name: 'Container', value: 'user-service']]
      }
